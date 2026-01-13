/**
 * Janus Library Loader Utility (Production-Hardened)
 * 
 * CRITICAL: This loader validates the Janus API contract before resolving.
 * 
 * The Janus library uses the LEGACY API:
 * - Janus.init({ debug: false, callback: () => { ... } })
 * - new Janus({ server: url, success: (session) => { ... }, error: (error) => { ... } })
 * 
 * There is NO Janus.create method. Any code checking for Janus.create is WRONG.
 * 
 * DEPENDENCY: Janus LEGACY requires adapter.js (WebRTC adapter) to be loaded FIRST.
 * Load order: adapter.js → janus.js → Janus.init()
 * 
 * This loader:
 * - Loads adapter.js before Janus
 * - Validates adapter is available before Janus initialization
 * - Validates required API methods exist
 * - Fails fast with descriptive errors
 * - Prevents regressions via runtime guards
 * - Logs detected API version
 * 
 * Janus types are defined in app/types/janus.d.ts
 */

export interface JanusLoaderOptions {
  scriptUrl?: string;
  timeoutMs?: number;
}

export class JanusLoaderError extends Error {
  constructor(message: string, public code: 'LOAD_FAILED' | 'TIMEOUT' | 'INVALID' | 'NOT_SUPPORTED' | 'API_MISMATCH' | 'ADAPTER_MISSING') {
    super(message);
    this.name = 'JanusLoaderError';
  }
}

/**
 * Required Janus API methods for legacy API
 * Legacy API: Janus.init() + new Janus()
 * Modern API: Would have different methods (not used here)
 */
const REQUIRED_LEGACY_APIS = ['init'];

/**
 * JanusLoader - Explicitly loads and verifies Janus library
 * 
 * Singleton pattern to prevent multiple simultaneous loads
 * Runtime guards prevent API mismatches
 */
export class JanusLoader {
  private static loadPromise: Promise<typeof window.Janus> | null = null;
  private static janusLibraryLoaded = false;
  private static adapterLoaded = false;
  private static readonly ADAPTER_SCRIPT_ID = 'webrtc-adapter-script';
  private static readonly JANUS_SCRIPT_ID = 'janus-library-script';
  // Use local files (served from /public/libs/)
  private static readonly DEFAULT_ADAPTER_URL = '/libs/adapter.min.js';
  private static readonly DEFAULT_SCRIPT_URL = '/libs/janus.js';
  private static readonly DEFAULT_TIMEOUT_MS = 10000;
  
  // API version detection
  private static detectedApiVersion: 'legacy' | 'modern' | 'unknown' = 'unknown';
  private static readonly EXPECTED_API_VERSION = 'legacy'; // We use legacy API

  /**
   * Load and verify Janus library
   * Returns cached promise if already loading/loaded
   * Returns the Janus object for direct use
   * 
   * FAILS FAST if API contract is wrong
   */
  static async load(options: JanusLoaderOptions = {}): Promise<typeof window.Janus> {
    // Return if already loaded and validated
    if (this.janusLibraryLoaded && this._verifyJanus()) {
      console.log('[JanusLoader] Library already loaded and verified');
      return Promise.resolve(window.Janus);
    }

    // Return existing loading promise if already in progress
    if (this.loadPromise) {
      console.log('[JanusLoader] Load already in progress, returning existing promise');
      return this.loadPromise;
    }

    const scriptUrl = options.scriptUrl || this.DEFAULT_SCRIPT_URL;
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;

    this.loadPromise = this._loadInternal(scriptUrl, timeoutMs);
    
    // Clear promise on error so we can retry
    this.loadPromise.catch(() => {
      this.loadPromise = null;
      this.janusLibraryLoaded = false;
      this.detectedApiVersion = 'unknown';
    });

    return this.loadPromise;
  }

  /**
   * Internal load implementation
   * 
   * CRITICAL: This method validates the API contract before resolving.
   * Any API mismatch causes immediate failure - no silent fallbacks.
   * 
   * Load order: adapter.js → janus.js → Janus.init()
   */
  private static async _loadInternal(scriptUrl: string, timeoutMs: number): Promise<typeof window.Janus> {
    // Check browser WebRTC support first
    if (typeof window === 'undefined') {
      throw new JanusLoaderError(
        'Janus loader requires browser environment',
        'NOT_SUPPORTED'
      );
    }

    if (!window.RTCPeerConnection) {
      throw new JanusLoaderError(
        'WebRTC is not supported in this browser',
        'NOT_SUPPORTED'
      );
    }

    // Check if already loaded and valid
    if (window.Janus && this._verifyJanus() && this.adapterLoaded) {
      console.log('[JanusLoader] ✅ Janus already loaded and verified');
      this.janusLibraryLoaded = true;
      return window.Janus;
    }

    // CRITICAL: Load adapter.js FIRST before Janus
    if (!this.adapterLoaded && !(window as any).adapter) {
      console.log('[JanusLoader] Loading WebRTC adapter.js...');
      await this._loadAdapter(this.DEFAULT_ADAPTER_URL, timeoutMs);
    }

    // Check if script is already loading
    const existingScript = document.getElementById(this.JANUS_SCRIPT_ID);
    if (existingScript) {
      console.log('[JanusLoader] Script tag already exists, waiting for load...');
      return this._waitForExistingLoad(timeoutMs);
    }

    // Load Janus script (using local file)
    console.log(`[JanusLoader] Loading Janus from: ${scriptUrl}`);
    return this._loadScript(scriptUrl, timeoutMs);
  }

  /**
   * Load WebRTC adapter.js (required dependency for Janus)
   * 
   * CRITICAL: Janus LEGACY requires adapter.js to be loaded globally before initialization.
   * The adapter must expose window.adapter or the initialization will fail.
   */
  private static async _loadAdapter(adapterUrl: string, timeoutMs: number): Promise<void> {
    // Check if adapter is already loaded
    if ((window as any).adapter) {
      console.log('[JanusLoader] ✅ Adapter already loaded');
      this.adapterLoaded = true;
      return Promise.resolve();
    }

    // Check if adapter script is already in the DOM
    const existingAdapterScript = document.getElementById(this.ADAPTER_SCRIPT_ID);
    if (existingAdapterScript) {
      // Wait for it to load
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if ((window as any).adapter) {
            clearInterval(checkInterval);
            this.adapterLoaded = true;
            console.log('[JanusLoader] ✅ Adapter loaded from existing script');
            resolve();
          } else if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            reject(new JanusLoaderError(
              'Adapter loading timeout',
              'TIMEOUT'
            ));
          }
        }, 100);
      });
    }

    // Load adapter script
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = adapterUrl;
      script.async = false; // Load synchronously before Janus
      script.id = this.ADAPTER_SCRIPT_ID;

      const timeoutId = setTimeout(() => {
        script.remove();
        reject(new JanusLoaderError(
          `Adapter.js failed to load within ${timeoutMs}ms`,
          'TIMEOUT'
        ));
      }, timeoutMs);

      script.onload = () => {
        clearTimeout(timeoutId);
        
        // CRITICAL: Validate adapter is available
        if (!(window as any).adapter) {
          script.remove();
          reject(new JanusLoaderError(
            'Adapter.js loaded but window.adapter is not defined. Ensure adapter.min.js is the correct UMD/global build.',
            'ADAPTER_MISSING'
          ));
          return;
        }

        console.log('[JanusLoader] ✅ Adapter.js loaded successfully');
        this.adapterLoaded = true;
        resolve();
      };

      script.onerror = (error) => {
        clearTimeout(timeoutId);
        script.remove();
        reject(new JanusLoaderError(
          `Failed to load adapter.js from ${adapterUrl}. Ensure the file exists in public/libs/`,
          'LOAD_FAILED'
        ));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Wait for existing script load
   */
  private static async _waitForExistingLoad(timeoutMs: number): Promise<typeof window.Janus> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (window.Janus && this._verifyJanus()) {
          clearInterval(checkInterval);
          this.janusLibraryLoaded = true;
          resolve(window.Janus);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new JanusLoaderError(
            'Janus library loading timeout',
            'TIMEOUT'
          ));
        }
      }, 100);
    });
  }

  /**
   * Load Janus script
   * 
   * CRITICAL: Adapter.js MUST be loaded before this method is called.
   * This is enforced by _loadInternal() which loads adapter first.
   */
  private static async _loadScript(scriptUrl: string, timeoutMs: number): Promise<typeof window.Janus> {
    // RUNTIME VALIDATION: Ensure adapter is loaded before Janus
    if (!(window as any).adapter) {
      throw new JanusLoaderError(
        'WebRTC adapter.js must be loaded before Janus. This is a critical dependency.',
        'ADAPTER_MISSING'
      );
    }

    return new Promise((resolve, reject) => {
      // Check if script already exists and remove it
      const existingScript = document.getElementById(this.JANUS_SCRIPT_ID);
      if (existingScript) {
        console.log('[JanusLoader] Removing existing script tag');
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.id = this.JANUS_SCRIPT_ID;

      const timeoutId = setTimeout(() => {
        script.remove();
        this.loadPromise = null;
        this.janusLibraryLoaded = false;
        reject(new JanusLoaderError(
          `Janus library failed to load within ${timeoutMs}ms`,
          'TIMEOUT'
        ));
      }, timeoutMs);

      script.onload = () => {
        clearTimeout(timeoutId);
        console.log('[JanusLoader] Script loaded, validating API contract...');
        
        // CRITICAL: Verify Janus object exists
        if (typeof window.Janus === 'undefined') {
          const error = new JanusLoaderError(
            'Janus object not found on window after script load',
            'INVALID'
          );
          this.loadPromise = null;
          this.janusLibraryLoaded = false;
          this.detectedApiVersion = 'unknown';
          script.remove();
          reject(error);
          return;
        }
        
        // CRITICAL: Validate API contract - check for required methods
        const apiValidation = this._validateJanusApi();
        if (!apiValidation.valid) {
          const error = new JanusLoaderError(
            `Janus API validation failed: ${apiValidation.error}`,
            'API_MISMATCH'
          );
          this.loadPromise = null;
          this.janusLibraryLoaded = false;
          this.detectedApiVersion = 'unknown';
          script.remove();
          reject(error);
          return;
        }

        // Log detected API version
        console.log(`[JanusLoader] ✅ Detected Janus API version: ${this.detectedApiVersion}`);
        console.log(`[JanusLoader] Expected API version: ${this.EXPECTED_API_VERSION}`);
        
        // Verify version matches expected
        if (this.detectedApiVersion !== this.EXPECTED_API_VERSION) {
          const error = new JanusLoaderError(
            `Janus API version mismatch: detected ${this.detectedApiVersion}, expected ${this.EXPECTED_API_VERSION}`,
            'API_MISMATCH'
          );
          this.loadPromise = null;
          this.janusLibraryLoaded = false;
          this.detectedApiVersion = 'unknown';
          script.remove();
          reject(error);
          return;
        }

        // RUNTIME VALIDATION: Assert adapter is available before initialization
        if (!(window as any).adapter) {
          const error = new JanusLoaderError(
            'WebRTC adapter.js failed to load - Janus initialization requires adapter',
            'ADAPTER_MISSING'
          );
          this.loadPromise = null;
          this.janusLibraryLoaded = false;
          this.detectedApiVersion = 'unknown';
          script.remove();
          reject(error);
          return;
        }

        // Initialize Janus (legacy API)
        try {
          window.Janus.init({
            debug: false,
            callback: () => {
              console.log('[JanusLoader] ✅ Janus initialized successfully');
              this.janusLibraryLoaded = true;
              resolve(window.Janus);
            },
            error: (error: string) => {
              console.error('[JanusLoader] Janus init error:', error);
              
              // Check if error is related to adapter
              if (error && error.toLowerCase().includes('adapter')) {
                const adapterError = new JanusLoaderError(
                  `Janus initialization failed - adapter.js issue: ${error}`,
                  'ADAPTER_MISSING'
                );
                this.loadPromise = null;
                this.janusLibraryLoaded = false;
                this.detectedApiVersion = 'unknown';
                script.remove();
                reject(adapterError);
                return;
              }
              
              const initError = new JanusLoaderError(
                `Janus initialization failed: ${error}`,
                'INVALID'
              );
              this.loadPromise = null;
              this.janusLibraryLoaded = false;
              this.detectedApiVersion = 'unknown';
              script.remove();
              reject(initError);
            },
          });
        } catch (error: any) {
          clearTimeout(timeoutId);
          this.loadPromise = null;
          this.janusLibraryLoaded = false;
          this.detectedApiVersion = 'unknown';
          script.remove();
          reject(new JanusLoaderError(
            `Janus initialization failed: ${error.message || 'Unknown error'}`,
            'INVALID'
          ));
        }
      };

      script.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('[JanusLoader] Failed to load script:', error);
        const loadError = new JanusLoaderError(
          `Failed to load Janus script from ${scriptUrl}`,
          'LOAD_FAILED'
        );
        this.loadPromise = null;
        this.janusLibraryLoaded = false;
        script.remove();
        reject(loadError);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Validate Janus API contract
   * 
   * CRITICAL: This method ensures the loaded Janus library matches the expected API.
   * Legacy API: Janus.init() + new Janus() constructor
   * Modern API: Different methods (not used here)
   * 
   * Returns validation result with error message if invalid
   */
  private static _validateJanusApi(): { valid: boolean; error?: string } {
    if (!window.Janus) {
      return { valid: false, error: 'Janus object is undefined' };
    }

    // Check for required legacy API methods
    for (const method of REQUIRED_LEGACY_APIS) {
      if (typeof window.Janus[method] !== 'function') {
        return { 
          valid: false, 
          error: `Missing required method: Janus.${method}()` 
        };
      }
    }

    // Detect API version by checking for modern API methods
    // Legacy API: has init, uses new Janus() constructor
    // Modern API: would have different methods (we don't use it)
    const hasLegacyInit = typeof window.Janus.init === 'function';
    const hasModernCreate = typeof (window.Janus as any).create === 'function';
    
    if (hasLegacyInit && !hasModernCreate) {
      this.detectedApiVersion = 'legacy';
      return { valid: true };
    } else if (hasModernCreate) {
      this.detectedApiVersion = 'modern';
      return { 
        valid: false, 
        error: 'Detected modern Janus API, but code expects legacy API (new Janus() constructor)' 
      };
    } else {
      this.detectedApiVersion = 'unknown';
      return { 
        valid: false, 
        error: 'Cannot determine Janus API version - missing both legacy and modern methods' 
      };
    }
  }

  /**
   * Verify Janus has required API methods (quick check)
   * Used for cached validation
   */
  private static _verifyJanus(): boolean {
    const validation = this._validateJanusApi();
    return validation.valid && this.detectedApiVersion === this.EXPECTED_API_VERSION;
  }

  /**
   * Check if Janus is loaded and ready
   * 
   * CRITICAL: This method validates the API contract, not just presence
   */
  static isReady(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    if (!window.Janus) {
      return false;
    }
    
    return this._verifyJanus();
  }

  /**
   * Get detected API version
   */
  static getApiVersion(): 'legacy' | 'modern' | 'unknown' {
    return this.detectedApiVersion;
  }

  /**
   * Reset loader state (for testing)
   */
  static reset(): void {
    this.loadPromise = null;
    this.janusLibraryLoaded = false;
    this.adapterLoaded = false;
    this.detectedApiVersion = 'unknown';
    const janusScript = document.getElementById(this.JANUS_SCRIPT_ID);
    if (janusScript) {
      janusScript.remove();
    }
    const adapterScript = document.getElementById(this.ADAPTER_SCRIPT_ID);
    if (adapterScript) {
      adapterScript.remove();
    }
  }
}
