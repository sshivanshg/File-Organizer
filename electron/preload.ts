import { contextBridge, ipcRenderer } from "electron";

/**
 * Exposes a minimal, safe API to the renderer via contextBridge.
 * No Node or Electron internals are exposed; only whitelisted IPC channels.
 */
const electronAPI = {
  getPlatform: (): Promise<string> => ipcRenderer.invoke("app:getPlatform"),
  getVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
};

contextBridge.exposeInMainWorld("electron", electronAPI);

export type ElectronAPI = typeof electronAPI;
