/// <reference types="vite/client" />

import type { ScanResult } from "./types/fileScanner";

declare global {
  interface Window {
    electron?: {
      getPlatform: () => Promise<string>;
      getVersion: () => Promise<string>;
      selectDirectory: () => Promise<string | null>;
      scanDirectory: (dirPath: string) => Promise<ScanResult>;
    };
  }
}

export {};
