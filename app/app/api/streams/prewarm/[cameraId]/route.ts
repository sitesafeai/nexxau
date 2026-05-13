import { NextRequest, NextResponse } from 'next/server';
import { requireCameraAccess } from '@/app/lib/api-route-auth';

/**
 * Pre-warm MediaMTX HLS stream
 * STRICT CONTRACT: Blocks until GET index.m3u8 returns 200 AND playlist contains #EXTINF
 * Treats 404 as failure. No fake success. Throws on timeout.
 */
async function prewarmHLS(url: string, timeoutMs = 12000): Promise<boolean> {
  const start = Date.now();
  const pollInterval = 300; // Check every 300ms

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok && res.status === 200) {
        const text = await res.text();
        
        // Check for #EXTINF directly (for variant playlists)
        if (text.includes('#EXTINF')) {
          console.log(`[prewarm] SUCCESS: Playlist ready with EXTINF (${Date.now() - start}ms)`);
          return true;
        }
        
        // Check for master playlist with variants (#EXT-X-STREAM-INF)
        // For master playlists, we need to check the variant playlist
        if (text.includes('#EXT-X-STREAM-INF') || text.includes('#EXT-X-MEDIA')) {
          // Extract video variant playlist URL (comes after #EXT-X-STREAM-INF line)
          // Match pattern: #EXT-X-STREAM-INF... followed by video*_stream.m3u8 on next line
          const variantMatch = text.match(/#EXT-X-STREAM-INF[^\n]*\n([^\n]+_stream\.m3u8)/);
          if (variantMatch && variantMatch[1]) {
            const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
            const variantUrl = baseUrl + variantMatch[1].trim();
            
            // Check variant playlist for EXTINF
            try {
              const variantRes = await fetch(variantUrl, {
                cache: 'no-store',
                signal: AbortSignal.timeout(3000),
              });
              if (variantRes.ok) {
                const variantText = await variantRes.text();
                if (variantText.includes('#EXTINF')) {
                  // Check for actual segments (not just gaps)
                  // Match pattern: hex_hash_videoN_segN.mp4 or any .m4s file or part files
                  const hasActualSegments = /[a-f0-9]{12,}_video\d+_seg\d+\.mp4|\.m4s|_part\d+\.mp4/.test(variantText);
                  
                  if (hasActualSegments) {
                    console.log(`[prewarm] SUCCESS: Variant playlist ready with actual segments (${Date.now() - start}ms)`);
                    return true;
                  } else {
                    // Has EXTINF but only gaps - this is OK if we're early in the stream
                    // For low-latency HLS, gaps are normal at the start
                    // If we've waited long enough (more than 3 seconds), accept gaps as valid
                    const elapsed = Date.now() - start;
                    if (elapsed > 3000) {
                      console.log(`[prewarm] SUCCESS: Variant playlist has EXTINF (gaps only, but source is ready) - accepting after ${elapsed}ms`);
                      return true;
                    } else {
                      console.log(`[prewarm] Variant playlist has EXTINF but only gaps (${elapsed}ms elapsed), waiting for actual segments...`);
                    }
                  }
                } else {
                  console.log(`[prewarm] Variant playlist exists but no EXTINF yet, continuing...`);
                }
              } else {
                console.log(`[prewarm] Variant playlist returned ${variantRes.status}, continuing...`);
              }
            } catch (e: any) {
              // Variant not ready yet, continue polling
              console.log(`[prewarm] Variant fetch failed: ${e.message}, continuing...`);
            }
          } else {
            console.log(`[prewarm] Master playlist detected but could not extract variant URL, continuing...`);
          }
        }
        
        // 200 but no EXTINF yet - continue polling
        console.log(`[prewarm] 200 OK but no EXTINF yet, continuing...`);
      } else {
        // 404 or other error - FAILURE, but continue polling (might be temporary)
        console.log(`[prewarm] HTTP ${res.status} - treating as failure, continuing to poll...`);
      }
    } catch (error: any) {
      // Network error - continue polling
      console.log(`[prewarm] Network error: ${error.message}, continuing...`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout reached - HARD FAILURE
  throw new Error(`HLS prewarm failed: playlist not available after ${timeoutMs}ms`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> }
) {
  try {
    const { cameraId } = await params;

    const auth = await requireCameraAccess(cameraId);
    if (!auth.ok) {
      return auth.response;
    }
    const { camera } = auth;

    if (!camera.mediamtxPath && !camera.hlsUrl) {
      return NextResponse.json(
        { success: false, error: 'Camera has no MediaMTX path or HLS URL' },
        { status: 400 }
      );
    }

    // Determine HLS URL and path name
    const hlsUrl = camera.hlsUrl || `http://localhost:8888/${camera.mediamtxPath}/index.m3u8`;
    const pathName = camera.mediamtxPath || hlsUrl.match(/\/([^\/]+)\/index\.m3u8/)?.[1];

    console.log(`[prewarm] Pre-warming HLS stream for camera ${cameraId}: ${hlsUrl}`);

    // Step 1: Verify MediaMTX path exists
    if (pathName) {
      try {
        const pathStatusResponse = await fetch(`http://localhost:9000/v3/paths/get/${pathName}`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });

        if (!pathStatusResponse.ok) {
          console.error(`[prewarm] MediaMTX path '${pathName}' does not exist (${pathStatusResponse.status})`);
          return NextResponse.json(
            { success: false, error: `MediaMTX path '${pathName}' does not exist. Please configure the camera first.` },
            { status: 400 }
          );
        }

        const pathStatus = await pathStatusResponse.json().catch(() => ({}));
        console.log(`[prewarm] MediaMTX path verified: ready=${pathStatus.ready || false}, tracks=${pathStatus.tracks?.length || 0}, readers=${pathStatus.readers?.length || 0}`);
      } catch (apiError: any) {
        console.warn(`[prewarm] Could not verify MediaMTX path (API unavailable):`, apiError.message);
        // Continue - might still work
      }
    }

    // Step 2: Trigger on-demand source by requesting playlist
    console.log(`[prewarm] Triggering on-demand source...`);
    try {
      await fetch(hlsUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      }).catch(() => {
        // Ignore - we're just triggering
      });
    } catch (e) {
      // Ignore - source might still start
    }

    // Step 3: Wait for source to be ready (optional - helps with diagnostics)
    if (pathName) {
      const sourceReadyTimeout = 8000;
      const sourceCheckInterval = 500;
      const sourceStartTime = Date.now();
      let sourceReady = false;

      while (Date.now() - sourceStartTime < sourceReadyTimeout && !sourceReady) {
        try {
          const pathStatusResponse = await fetch(`http://localhost:9000/v3/paths/get/${pathName}`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
          });

          if (pathStatusResponse.ok) {
            const pathStatus = await pathStatusResponse.json().catch(() => ({}));
            if (pathStatus.ready === true && pathStatus.tracks?.length > 0 && pathStatus.bytesReceived > 0) {
              console.log(`[prewarm] Source ready: tracks=${pathStatus.tracks.length}, bytes=${pathStatus.bytesReceived}`);
              sourceReady = true;
              break;
            }
          }
        } catch (e) {
          // Continue checking
        }

        await new Promise((resolve) => setTimeout(resolve, sourceCheckInterval));
      }

      if (!sourceReady) {
        console.warn(`[prewarm] Source not ready after ${sourceReadyTimeout}ms, but proceeding to check playlist...`);
      }
    }

    // Step 4: STRICT pre-warm - blocks until 200 + EXTINF
    try {
      await prewarmHLS(hlsUrl, 12000); // 12 seconds to allow for segment generation
      return NextResponse.json({
        success: true,
        message: 'Stream pre-warmed successfully - playlist is ready',
        hlsUrl,
      });
    } catch (error: any) {
      // Get diagnostic info
      let diagnosticInfo = '';
      if (pathName) {
        try {
          const finalStatusResponse = await fetch(`http://localhost:9000/v3/paths/get/${pathName}`, {
            method: 'GET',
            signal: AbortSignal.timeout(1000),
          });
          if (finalStatusResponse.ok) {
            const finalStatus = await finalStatusResponse.json().catch(() => ({}));
            diagnosticInfo = ` Source status: ready=${finalStatus.ready}, tracks=${finalStatus.tracks?.length || 0}, readers=${finalStatus.readers?.length || 0}.`;
          }
        } catch (e) {
          // Ignore
        }
      }

      console.error(`[prewarm] ${error.message}${diagnosticInfo}`);
      return NextResponse.json(
        {
          success: false,
          error: `${error.message}${diagnosticInfo} MediaMTX may need more time to generate HLS segments, or there may be a configuration issue.`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[prewarm] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
