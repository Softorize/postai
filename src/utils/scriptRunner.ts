/**
 * Script Runner - Executes pre-request and test scripts with a Postman-like pm object
 */

export interface ScriptContext {
  // Request data (mutable for pre-request scripts)
  request: {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
  }
  // Response data (for test scripts)
  response?: {
    code: number
    status: string
    responseTime: number
    headers: Record<string, string>
    body: string
  }
  // Environment variables
  environment: Record<string, string>
  // Collection/request variables
  variables: Record<string, string>
}

export interface ScriptResult {
  success: boolean
  error?: string
  logs: Array<{ type: 'log' | 'error' | 'warn' | 'info'; args: unknown[] }>
  // Updated values
  environment: Record<string, string>
  variables: Record<string, string>
  request: ScriptContext['request']
  // Test results (for test scripts)
  testResults?: Array<{ name: string; passed: boolean; error?: string }>
}

/**
 * Creates the pm object that scripts can use
 */
function createPmObject(
  context: ScriptContext,
  _logs: ScriptResult['logs'],
  testResults: ScriptResult['testResults']
) {
  const environment = { ...context.environment }
  const variables = { ...context.variables }
  const request = { ...context.request, headers: { ...context.request.headers } }

  const pm = {
    environment: {
      get: (key: string): string | undefined => environment[key],
      set: (key: string, value: string): void => {
        environment[key] = String(value)
      },
      unset: (key: string): void => {
        delete environment[key]
      },
      has: (key: string): boolean => key in environment,
      toObject: (): Record<string, string> => ({ ...environment }),
    },

    variables: {
      get: (key: string): string | undefined => variables[key],
      set: (key: string, value: string): void => {
        variables[key] = String(value)
      },
      unset: (key: string): void => {
        delete variables[key]
      },
      has: (key: string): boolean => key in variables,
      // Utility functions
      uuid: (): string => crypto.randomUUID(),
      timestamp: (): number => Date.now(),
      randomInt: (min: number, max: number): number =>
        Math.floor(Math.random() * (max - min + 1)) + min,
    },

    request: {
      get url() { return request.url },
      set url(value: string) { request.url = value },
      get method() { return request.method },
      set method(value: string) { request.method = value },
      get body() { return request.body },
      set body(value: string | undefined) { request.body = value },
      headers: {
        add: (key: string, value: string): void => {
          request.headers[key] = value
        },
        remove: (key: string): void => {
          delete request.headers[key]
        },
        get: (key: string): string | undefined => request.headers[key],
        toObject: (): Record<string, string> => ({ ...request.headers }),
      },
    },

    response: context.response ? {
      code: context.response.code,
      status: context.response.status,
      responseTime: context.response.responseTime,
      headers: context.response.headers,
      text: (): string => context.response?.body || '',
      json: (): unknown => {
        try {
          return JSON.parse(context.response?.body || '{}')
        } catch {
          throw new Error('Response body is not valid JSON')
        }
      },
    } : undefined,

    test: (name: string, fn: () => void): void => {
      try {
        fn()
        testResults?.push({ name, passed: true })
      } catch (e) {
        testResults?.push({
          name,
          passed: false,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    },

    expect: (value: unknown) => createExpect(value),
  }

  // Return both pm and the mutable state
  return { pm, environment, variables, request }
}

/**
 * Creates a simple expect-like assertion object
 */
function createExpect(actual: unknown) {
  return {
    to: {
      equal: (expected: unknown): void => {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
        }
      },
      be: {
        below: (n: number): void => {
          if (typeof actual !== 'number' || actual >= n) {
            throw new Error(`Expected ${actual} to be below ${n}`)
          }
        },
        above: (n: number): void => {
          if (typeof actual !== 'number' || actual <= n) {
            throw new Error(`Expected ${actual} to be above ${n}`)
          }
        },
        get ok() {
          if (!actual) {
            throw new Error(`Expected ${actual} to be truthy`)
          }
          return undefined
        },
        get true() {
          if (actual !== true) {
            throw new Error(`Expected ${actual} to be true`)
          }
          return undefined
        },
        get false() {
          if (actual !== false) {
            throw new Error(`Expected ${actual} to be false`)
          }
          return undefined
        },
      },
      have: {
        property: (name: string): void => {
          if (typeof actual !== 'object' || actual === null || !(name in actual)) {
            throw new Error(`Expected object to have property "${name}"`)
          }
        },
      },
      include: (value: unknown): void => {
        if (typeof actual === 'string') {
          if (!actual.includes(String(value))) {
            throw new Error(`Expected "${actual}" to include "${value}"`)
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(value)) {
            throw new Error(`Expected array to include ${JSON.stringify(value)}`)
          }
        } else {
          throw new Error('include() can only be used with strings or arrays')
        }
      },
    },
  }
}

/**
 * Executes a script with the pm context
 */
export async function executeScript(
  script: string,
  context: ScriptContext,
  type: 'pre-request' | 'tests'
): Promise<ScriptResult> {
  const logs: ScriptResult['logs'] = []
  const testResults: ScriptResult['testResults'] = type === 'tests' ? [] : undefined

  if (!script.trim()) {
    return {
      success: true,
      logs,
      environment: context.environment,
      variables: context.variables,
      request: context.request,
      testResults,
    }
  }

  try {
    const { pm, environment, variables, request } = createPmObject(
      context,
      logs,
      testResults
    )

    // Create sandboxed console
    const sandboxedConsole = {
      log: (...args: unknown[]) => logs.push({ type: 'log', args }),
      error: (...args: unknown[]) => logs.push({ type: 'error', args }),
      warn: (...args: unknown[]) => logs.push({ type: 'warn', args }),
      info: (...args: unknown[]) => logs.push({ type: 'info', args }),
    }

    // Postman compatibility variables
    const responseBody = context.response?.body || ''
    const responseCode = context.response?.code || 0
    const responseTime = context.response?.responseTime || 0
    const responseHeaders = context.response?.headers || {}

    // Create the function with pm, console, and Postman compat variables in scope
    // Using Function constructor to create a sandboxed execution context
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const scriptFn = new AsyncFunction(
      'pm', 'console', 'responseBody', 'responseCode', 'responseTime', 'responseHeaders',
      script
    )

    // Execute the script
    await scriptFn(pm, sandboxedConsole, responseBody, responseCode, responseTime, responseHeaders)

    return {
      success: true,
      logs,
      environment,
      variables,
      request,
      testResults,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs,
      environment: context.environment,
      variables: context.variables,
      request: context.request,
      testResults,
    }
  }
}

/**
 * Runs pre-request script and returns modified request data
 */
export async function runPreRequestScript(
  script: string,
  request: ScriptContext['request'],
  environment: Record<string, string>,
  variables: Record<string, string> = {}
): Promise<ScriptResult> {
  return executeScript(
    script,
    { request, environment, variables },
    'pre-request'
  )
}

/**
 * Runs test script and returns test results
 */
export async function runTestScript(
  script: string,
  request: ScriptContext['request'],
  response: NonNullable<ScriptContext['response']>,
  environment: Record<string, string>,
  variables: Record<string, string> = {}
): Promise<ScriptResult> {
  return executeScript(
    script,
    { request, response, environment, variables },
    'tests'
  )
}
