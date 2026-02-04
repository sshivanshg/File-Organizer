/// <reference types="vite/client" />

interface Window {
  electron?: {
    getPlatform: () => Promise<string>;
    getVersion: () => Promise<string>;
  };
}
