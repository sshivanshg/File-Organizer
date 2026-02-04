import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import { scanDirectory } from "./fileScanner";

/**
 * Creates the main application window with macOS-native styling.
 * Uses frameless window, hidden inset title bar, vibrancy, and dark background.
 */
function createWindow(): void {
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  win.once("ready-to-show", () => win.show());

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/** Registers safe IPC handlers for renderer communication. */
function registerIpcHandlers(): void {
  ipcMain.handle("app:getPlatform", () => process.platform);
  ipcMain.handle("app:getVersion", () => app.getVersion());

  ipcMain.handle("app:selectDirectory", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined, {
      properties: ["openDirectory"],
      title: "Select directory",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("app:scanDirectory", async (_event, dirPath: string) => {
    if (typeof dirPath !== "string" || !dirPath.trim()) {
      throw new Error("Invalid directory path");
    }
    return scanDirectory(dirPath);
  });
}
