import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { app } from 'electron'
import http from 'http'

interface DjangoManagerOptions {
  port?: number
  host?: string
  isDev?: boolean
}

interface DjangoStatus {
  running: boolean
  port: number
  host: string
}

export class PythonNotFoundError extends Error {
  constructor(
    public searchedPaths: string[],
    public requiredVersion: string = '3.13'
  ) {
    super(`Python ${requiredVersion} not found`)
    this.name = 'PythonNotFoundError'
  }
}

export class DjangoManager {
  private process: ChildProcess | null = null
  private port: number
  private host: string
  private isDev: boolean
  private isReady = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private startupTimeout: NodeJS.Timeout | null = null
  private externalMode = false // True if using external Django server
  private searchedPaths: string[] = []

  constructor(options: DjangoManagerOptions = {}) {
    this.port = options.port || 8765
    this.host = options.host || '127.0.0.1'
    this.isDev = options.isDev ?? false
  }

  /**
   * Find the bundled postai-server executable
   */
  private findBundledServer(): string | null {
    this.searchedPaths = []

    if (this.isDev) {
      // Development: Check if bundled server exists in backend/dist
      const devBundled = path.join(__dirname, '../../backend/dist/postai-server/postai-server')
      this.searchedPaths.push(devBundled)
      if (fs.existsSync(devBundled)) {
        return devBundled
      }
      return null // In dev, we'll fall back to Python
    }

    // Packaged app: Check for bundled server in resources
    const resourcesPath = process.resourcesPath

    // Primary location: bundled server directory
    const bundledServer = path.join(resourcesPath, 'postai-server', 'postai-server')
    this.searchedPaths.push(bundledServer)
    if (fs.existsSync(bundledServer)) {
      return bundledServer
    }

    return null
  }

  async start(): Promise<void> {
    if (this.process) {
      console.log('Django server is already running')
      return
    }

    // Check if Django is already running externally
    const externalRunning = await this.checkHealth()
    if (externalRunning) {
      console.log('Django server detected running externally')
      this.externalMode = true
      this.isReady = true
      this.startHealthCheck()
      return
    }

    // Try bundled server first (for packaged app)
    const bundledServer = this.findBundledServer()
    if (bundledServer) {
      console.log(`Starting bundled PostAI server: ${bundledServer}`)
      return this.startBundledServer(bundledServer)
    }

    // Fall back to Python-based approach (for development)
    const pythonPath = this.findPythonPath()

    // Check if Python exists
    if (!pythonPath) {
      console.log('PostAI backend not found. Searched paths:')
      this.searchedPaths.forEach(p => console.log(`  - ${p}`))

      // Throw detailed error for the UI to display
      throw new PythonNotFoundError(this.searchedPaths, '3.13')
    }

    return this.startPythonServer(pythonPath)
  }

  private startBundledServer(serverPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Starting bundled server on ${this.host}:${this.port}`)

      this.process = spawn(
        serverPath,
        ['runserver', '--host', this.host, '--port', String(this.port)],
        {
          env: {
            ...process.env,
            POSTAI_DB_PATH: this.getDatabasePath(),
            PYTHONUNBUFFERED: '1',  // Ensure output is flushed immediately
          },
        }
      )

      this.process.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log(`PostAI: ${output}`)

        // Check for server ready signals
        if (output.includes('Starting PostAI backend') || output.includes('Starting development server') || output.includes('Quit the server')) {
          this.isReady = true
          this.startHealthCheck()
          if (this.startupTimeout) {
            clearTimeout(this.startupTimeout)
            this.startupTimeout = null
          }
          resolve()
        }
      })

      this.process.stderr?.on('data', (data) => {
        const output = data.toString()
        // Log stderr but don't treat as fatal - Django logs info to stderr
        console.log(`PostAI: ${output}`)

        // Check for server ready signals (Django logs to stderr)
        if (output.includes('Starting PostAI backend') || output.includes('Starting development server') || output.includes('Quit the server')) {
          this.isReady = true
          this.startHealthCheck()
          if (this.startupTimeout) {
            clearTimeout(this.startupTimeout)
            this.startupTimeout = null
          }
          resolve()
        }
      })

      this.process.on('error', (error) => {
        console.error('Failed to start PostAI server:', error)
        reject(error)
      })

      this.process.on('exit', (code) => {
        console.log(`PostAI server exited with code ${code}`)
        this.isReady = false
        this.process = null
        this.stopHealthCheck()
      })

      // Timeout for startup (30s to allow for slower Linux/PyInstaller startup)
      this.startupTimeout = setTimeout(() => {
        this.checkHealth().then((healthy) => {
          if (healthy) {
            this.isReady = true
            this.startHealthCheck()
            resolve()
          } else {
            reject(new Error('PostAI server startup timeout'))
          }
        })
      }, 30000)
    })
  }

  private startPythonServer(pythonPath: string): Promise<void> {
    const backendPath = this.getBackendPath()
    const managePyPath = path.join(backendPath, 'manage.py')

    console.log(`Starting Django with Python: ${pythonPath}`)
    console.log(`Backend path: ${backendPath}`)
    console.log(`manage.py path: ${managePyPath}`)

    return new Promise((resolve, reject) => {
      // First run migrations
      const migrateProcess = spawn(pythonPath, [managePyPath, 'migrate', '--run-syncdb'], {
        env: {
          ...process.env,
          DJANGO_SETTINGS_MODULE: 'postai.settings',
          POSTAI_DB_PATH: this.getDatabasePath(),
          PYTHONUNBUFFERED: '1',
        },
        cwd: backendPath,
      })

      migrateProcess.stdout?.on('data', (data) => {
        console.log(`Django migrate: ${data}`)
      })

      migrateProcess.stderr?.on('data', (data) => {
        console.error(`Django migrate error: ${data}`)
      })

      migrateProcess.on('close', (code) => {
        if (code !== 0) {
          console.warn(`Migration exited with code ${code}, continuing anyway...`)
        }

        // Start the server
        this.process = spawn(
          pythonPath,
          [managePyPath, 'runserver', `${this.host}:${this.port}`, '--noreload'],
          {
            env: {
              ...process.env,
              DJANGO_SETTINGS_MODULE: 'postai.settings',
              POSTAI_DB_PATH: this.getDatabasePath(),
              PYTHONUNBUFFERED: '1',
            },
            cwd: backendPath,
          }
        )

        this.process.stdout?.on('data', (data) => {
          const output = data.toString()
          console.log(`Django: ${output}`)

          if (output.includes('Starting development server') || output.includes('Quit the server')) {
            this.isReady = true
            this.startHealthCheck()
            if (this.startupTimeout) {
              clearTimeout(this.startupTimeout)
              this.startupTimeout = null
            }
            resolve()
          }
        })

        this.process.stderr?.on('data', (data) => {
          const output = data.toString()
          // Django logs info to stderr
          console.log(`Django: ${output}`)

          if (output.includes('Starting development server') || output.includes('Quit the server')) {
            this.isReady = true
            this.startHealthCheck()
            if (this.startupTimeout) {
              clearTimeout(this.startupTimeout)
              this.startupTimeout = null
            }
            resolve()
          }
        })

        this.process.on('error', (error) => {
          console.error('Failed to start Django:', error)
          reject(error)
        })

        this.process.on('exit', (code) => {
          console.log(`Django exited with code ${code}`)
          this.isReady = false
          this.process = null
          this.stopHealthCheck()
        })

        // Timeout for startup
        this.startupTimeout = setTimeout(() => {
          // Check if server is actually running via health check
          this.checkHealth().then((healthy) => {
            if (healthy) {
              this.isReady = true
              this.startHealthCheck()
              resolve()
            } else {
              reject(new Error('Django server startup timeout'))
            }
          })
        }, 15000)
      })
    })
  }

  async stop(): Promise<void> {
    this.stopHealthCheck()

    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout)
      this.startupTimeout = null
    }

    // Don't try to stop external server
    if (this.externalMode) {
      this.isReady = false
      return
    }

    if (this.process) {
      return new Promise((resolve) => {
        const cleanup = () => {
          this.process = null
          this.isReady = false
          resolve()
        }

        this.process!.on('exit', cleanup)

        // Try graceful shutdown first
        this.process!.kill('SIGTERM')

        // Force kill after timeout
        setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL')
            cleanup()
          }
        }, 5000)
      })
    }
  }

  private async waitForExternalServer(): Promise<void> {
    const maxRetries = 30 // Wait up to 30 seconds
    const retryInterval = 1000

    for (let i = 0; i < maxRetries; i++) {
      const healthy = await this.checkHealth()
      if (healthy) {
        console.log('External Django server is ready')
        this.isReady = true
        this.startHealthCheck()
        return
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval))
    }

    console.warn('External Django server not detected after 30s, continuing anyway...')
    // Don't throw - let the app start and show connection error in UI
    this.isReady = false
  }

  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  getStatus(): DjangoStatus {
    return {
      running: this.isReady,
      port: this.port,
      host: this.host,
    }
  }

  getBaseUrl(): string {
    return `http://${this.host}:${this.port}`
  }

  private findPythonPath(): string | null {
    // Append to searchedPaths (already initialized by findBundledServer)
    const homeDir = os.homedir()

    if (this.isDev) {
      // Development: Use venv Python
      const venvPython = path.join(this.getBackendPath(), '.venv', 'bin', 'python')
      this.searchedPaths.push(venvPython)
      if (fs.existsSync(venvPython)) {
        return venvPython
      }
      return null
    }

    // Packaged app: Check multiple locations
    const resourcesPath = process.resourcesPath

    // 1. First try bundled Python
    const bundledPython = path.join(resourcesPath, 'python', 'venv', 'bin', 'python')
    this.searchedPaths.push(bundledPython)
    if (fs.existsSync(bundledPython)) {
      return bundledPython
    }

    // 2. Try backend's venv if it was bundled (check if symlink target exists)
    const backendVenv = path.join(resourcesPath, 'backend', '.venv', 'bin', 'python')
    this.searchedPaths.push(backendVenv)
    if (fs.existsSync(backendVenv)) {
      // Check if it's a symlink and the target exists
      try {
        const realPath = fs.realpathSync(backendVenv)
        if (fs.existsSync(realPath)) {
          return backendVenv
        }
        this.searchedPaths.push(`${backendVenv} -> ${realPath} (broken symlink)`)
      } catch {
        // Symlink target doesn't exist
      }
    }

    // 3. Check pyenv installations (Python 3.13.x)
    const pyenvRoot = process.env.PYENV_ROOT || path.join(homeDir, '.pyenv')
    const pyenvVersionsDir = path.join(pyenvRoot, 'versions')
    if (fs.existsSync(pyenvVersionsDir)) {
      try {
        const versions = fs.readdirSync(pyenvVersionsDir)
          .filter(v => v.startsWith('3.13'))
          .sort()
          .reverse() // Get highest version first

        for (const version of versions) {
          const pyenvPython = path.join(pyenvVersionsDir, version, 'bin', 'python')
          this.searchedPaths.push(pyenvPython)
          if (fs.existsSync(pyenvPython)) {
            console.log(`Using pyenv Python: ${pyenvPython}`)
            return pyenvPython
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // 4. Check Python.framework (from python.org installer)
    const frameworkPython = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3'
    this.searchedPaths.push(frameworkPython)
    if (fs.existsSync(frameworkPython)) {
      console.log(`Using Python.framework: ${frameworkPython}`)
      return frameworkPython
    }

    // 5. Check Homebrew locations
    const homebrewPaths = [
      '/opt/homebrew/bin/python3.13',  // Apple Silicon
      '/usr/local/bin/python3.13',      // Intel
      '/opt/homebrew/opt/python@3.13/bin/python3.13',
      '/usr/local/opt/python@3.13/bin/python3.13',
    ]
    for (const brewPython of homebrewPaths) {
      this.searchedPaths.push(brewPython)
      if (fs.existsSync(brewPython)) {
        console.log(`Using Homebrew Python: ${brewPython}`)
        return brewPython
      }
    }

    // 6. Last resort: system Python3 (may not have required packages)
    try {
      const systemPython = execSync('which python3', { encoding: 'utf8' }).trim()
      if (systemPython) {
        this.searchedPaths.push(systemPython)
        // Check Python version
        const versionOutput = execSync(`${systemPython} --version`, { encoding: 'utf8' }).trim()
        if (versionOutput.includes('3.13')) {
          console.log(`Using system Python: ${systemPython}`)
          return systemPython
        }
        this.searchedPaths.push(`${systemPython} (${versionOutput} - need 3.13)`)
      }
    } catch {
      // Ignore errors
    }

    return null
  }


  private getBackendPath(): string {
    if (this.isDev) {
      // Development: backend is in project root
      return path.join(__dirname, '../../backend')
    } else {
      // Packaged: backend is in resources
      return path.join(process.resourcesPath, 'backend')
    }
  }

  private getDatabasePath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'postai.db')
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.checkHealth()
      if (!healthy && this.isReady) {
        console.log('Django health check failed, attempting restart...')
        try {
          await this.restart()
        } catch (error) {
          console.error('Failed to restart Django:', error)
        }
      }
    }, 30000) // Check every 30 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  private checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${this.host}:${this.port}/api/v1/health/`,
        { timeout: 5000 },
        (res) => {
          resolve(res.statusCode === 200)
        }
      )

      req.on('error', () => resolve(false))
      req.on('timeout', () => {
        req.destroy()
        resolve(false)
      })
    })
  }
}
