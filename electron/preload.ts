import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Django backend
  django: {
    getStatus: () => ipcRenderer.invoke('django:status'),
    restart: () => ipcRenderer.invoke('django:restart'),
    getBaseUrl: () => ipcRenderer.invoke('django:get-base-url'),
  },

  // File system
  fs: {
    openFileDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('fs:open-file-dialog', options),
    saveFileDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('fs:save-file-dialog', options),
  },

  // Native
  native: {
    getAppPath: () => ipcRenderer.invoke('native:get-app-path'),
    getPlatform: () => ipcRenderer.invoke('native:get-platform'),
    openExternal: (url: string) => ipcRenderer.invoke('native:open-external', url),
  },

  // App
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    isDev: () => ipcRenderer.invoke('app:is-dev'),
  },
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electron: {
      django: {
        getStatus: () => Promise<{ running: boolean; port: number; host: string }>
        restart: () => Promise<{ running: boolean; port: number; host: string }>
        getBaseUrl: () => Promise<string>
      }
      fs: {
        openFileDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
        saveFileDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
      }
      native: {
        getAppPath: () => Promise<string>
        getPlatform: () => Promise<NodeJS.Platform>
        openExternal: (url: string) => Promise<void>
      }
      app: {
        getVersion: () => Promise<string>
        isDev: () => Promise<boolean>
      }
    }
  }
}
