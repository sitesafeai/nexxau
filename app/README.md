## MediaMTX HLS Proxy

Nexxau streams camera playback through the Next.js proxy route instead of exposing
MediaMTX directly to browsers:

- Browser requests: `/api/hls/<streamId>/index.m3u8`
- Next.js proxy route: `app/api/hls/[...path]/route.ts`
- Upstream MediaMTX HLS origin: `MEDIAMTX_HLS_ORIGIN`
- Upstream auth: `MEDIAMTX_API_USERNAME` + `MEDIAMTX_API_PASSWORD`

### Required environment variables

- `NEXT_PUBLIC_MEDIAMTX_HLS_URL=/api/hls`
- `MEDIAMTX_HLS_ORIGIN=http://localhost:8888` (local example)
- `MEDIAMTX_API_URL=http://localhost:9000`
- `MEDIAMTX_API_USERNAME=admin`
- `MEDIAMTX_API_PASSWORD=nexxau`

### Production note (Vercel)

If Next.js runs on Vercel, do not use `localhost` for `MEDIAMTX_HLS_ORIGIN`.
Set it to a MediaMTX host reachable from Vercel (public endpoint, tunnel, or
co-located private network).

 
