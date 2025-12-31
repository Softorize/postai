import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
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

export class DjangoManager {
  private process: ChildProcess | null = null
  private port: number
  private host: string
  private isDev: boolean
  private isReady = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private startupTimeout: NodeJS.Timeout | null = null
  private externalMode = false // True if using external Django server

  constructor(options: DjangoManagerOptions = {}) {
    this.port = options.port || 8765
    this.host = options.host || '127.0.0.1'
    this.isDev = options.isDev ?? false
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

    const pythonPath = this.findPythonPath()

    // Check if Python exists
    if (!pythonPath || !fs.existsSync(pythonPath)) {
      console.log(`Python not found at ${pythonPath}, waiting for external Django server...`)
      this.externalMode = true
      // Wait for external server with retries
      await this.waitForExternalServer()
      return
    }

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

  private findPythonPath(): string {
    if (this.isDev) {
      // Development: Use venv Python
      const venvPython = path.join(this.getBackendPath(), '.venv', 'bin', 'python')
      return venvPython
    } else {
      // Packaged app: Python is in resources
      const resourcesPath = process.resourcesPath
      return path.join(resourcesPath, 'python', 'venv', 'bin', 'python')
    }
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
