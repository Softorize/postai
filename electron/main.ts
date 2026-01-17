import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron'
import path from 'path'
import { DjangoManager, PythonNotFoundError } from './services/django-manager'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Only load on Windows platform
if (process.platform === 'win32') {
  try {
    if (require('electron-squirrel-startup')) {
      app.quit()
    }
  } catch {
    // Module not available, skip
  }
}

let mainWindow: BrowserWindow | null = null
let djangoManager: DjangoManager | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
    backgroundColor: '#252526',
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function startDjango() {
  djangoManager = new DjangoManager({
    port: 8765,
    isDev,
  })

  try {
    await djangoManager.start()
    console.log('Django server started successfully')
  } catch (error) {
    console.error('Failed to start Django server:', error)

    if (error instanceof PythonNotFoundError) {
      const searchedPaths = error.searchedPaths.slice(0, 10).join('\n  • ')
      dialog.showErrorBox(
        'Python 3.13 Required',
        `PostAI requires Python ${error.requiredVersion} to run the backend server.\n\n` +
        `Searched locations:\n  • ${searchedPaths}\n\n` +
        `Please install Python ${error.requiredVersion} using one of these methods:\n\n` +
        `• pyenv: pyenv install 3.13.0\n` +
        `• Homebrew: brew install python@3.13\n` +
        `• python.org: Download from https://www.python.org/downloads/`
      )
    } else {
      dialog.showErrorBox(
        'Backend Error',
        'Failed to start the backend server.\n\n' +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        'Please check the logs and try again.'
      )
    }
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // Django status
  ipcMain.handle('django:status', () => {
    return djangoManager?.getStatus() ?? { running: false, port: 0, host: '' }
  })

  ipcMain.handle('django:restart', async () => {
    await djangoManager?.restart()
    return djangoManager?.getStatus()
  })

  ipcMain.handle('django:get-base-url', () => {
    return djangoManager?.getBaseUrl() ?? 'http://127.0.0.1:8765'
  })

  // File system operations
  ipcMain.handle('fs:open-file-dialog', async (_, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, options)
    return result
  })

  ipcMain.handle('fs:save-file-dialog', async (_, options) => {
    const result = await dialog.showSaveDialog(mainWindow!, options)
    return result
  })

  // Native operations
  ipcMain.handle('native:get-app-path', () => {
    return app.getPath('userData')
  })

  ipcMain.handle('native:get-platform', () => {
    return process.platform
  })

  ipcMain.handle('native:open-external', async (_, url) => {
    await shell.openExternal(url)
  })

  // App info
  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:is-dev', () => {
    return isDev
  })
}

function ensureDjangoRunning() {
  if (!djangoManager) {
    startDjango()
    return
  }
  const status = djangoManager.getStatus()
  if (!status.running) {
    startDjango()
  }
}

// App lifecycle
app.whenReady().then(async () => {
  // Configure CSP to allow script execution for pre-request/test scripts
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["script-src 'self' 'unsafe-inline' 'unsafe-eval'"]
      }
    })
  })

  setupIpcHandlers()

  // Create window immediately to show loading state
  // while Django starts in the background
  await createWindow()

  // Start Django in background - frontend will poll for readiness
  startDjango()

  app.on('activate', async () => {
    // Show existing window if it exists
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }

    // Always ensure Django is running when app is activated
    ensureDjangoRunning()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (djangoManager) {
    await djangoManager.stop()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})
