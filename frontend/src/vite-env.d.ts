/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where game WebSockets connect, e.g. "wss://chess960-backend.onrender.com". Unset
   * means the same host as the page (local dev, Docker Compose, Kubernetes). Needed on
   * Vercel, which proxies /api but can't proxy WebSockets. */
  readonly VITE_BACKEND_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
