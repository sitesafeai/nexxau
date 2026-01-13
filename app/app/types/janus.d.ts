/**
 * TypeScript definitions for Janus WebRTC Gateway JavaScript client
 */

declare global {
  interface Window {
    Janus?: {
      init: (options: {
        debug?: boolean | string | string[];
        callback?: () => void;
        error?: (error: string) => void;
        dependencies?: any;
      }) => void;
      create: (options: {
        server: string | string[];
        iceServers?: RTCIceServer[];
        ipv6?: boolean;
        withCredentials?: boolean;
        max_poll_events?: number;
        token?: string;
        apisecret?: string;
        success?: (session: any) => void;
        error?: (error: any) => void;
        destroyed?: () => void;
        transportClosed?: () => void;
      }) => void;
      isWebrtcSupported: () => boolean;
      debug: (...args: any[]) => void;
      log: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
      randomString: (length?: number) => string;
      stopAllTracks: (stream: MediaStream) => void;
      extension?: {
        isInstalled: () => boolean;
        init: () => void;
      };
      sessions?: Map<any, any>;
      initDone?: boolean;
    };
  }
}

export {};

