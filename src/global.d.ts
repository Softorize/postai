// Global type definitions

// Electron API exposed via preload script
declare global {
  interface Window {
    electron: {
      django: {
        getStatus: () => Promise<{ running: boolean; port: number; host: string }>
        restart: () => Promise<{ running: boolean; port: number; host: string }>
        getBaseUrl: () => Promise<string>
      }
      fs: {
        openFileDialog: (options: {
          title?: string
          filters?: { name: string; extensions: string[] }[]
          properties?: ('openFile' | 'openDirectory' | 'multiSelections')[]
        }) => Promise<{ canceled: boolean; filePaths: string[] }>
        saveFileDialog: (options: {
          defaultPath?: string
          filters?: { name: string; extensions: string[] }[]
        }) => Promise<{ canceled: boolean; filePath?: string }>
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

export {}
