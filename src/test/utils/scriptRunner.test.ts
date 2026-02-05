import { describe, it, expect } from 'vitest'
import {
  executeScript,
  runPreRequestScript,
  runTestScript,
  ScriptContext,
} from '@/utils/scriptRunner'

const createBaseContext = (overrides: Partial<ScriptContext> = {}): ScriptContext => ({
  request: {
    url: 'https://api.example.com/users',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  },
  environment: { BASE_URL: 'https://api.example.com' },
  variables: { userId: '123' },
  ...overrides,
})

describe('Script Runner', () => {
  describe('executeScript', () => {
    it('should return success for empty script', async () => {
      const result = await executeScript('', createBaseContext(), 'pre-request')

      expect(result.success).toBe(true)
      expect(result.logs).toHaveLength(0)
    })

    it('should return success for whitespace-only script', async () => {
      const result = await executeScript('   \n  ', createBaseContext(), 'pre-request')

      expect(result.success).toBe(true)
    })

    it('should execute script and return success', async () => {
      const result = await executeScript(
        'console.log("hello")',
        createBaseContext(),
        'pre-request'
      )

      expect(result.success).toBe(true)
      expect(result.logs).toHaveLength(1)
      expect(result.logs[0].type).toBe('log')
      expect(result.logs[0].args).toEqual(['hello'])
    })

    it('should capture errors and return failure', async () => {
      const result = await executeScript(
        'throw new Error("test error")',
        createBaseContext(),
        'pre-request'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('test error')
    })

    it('should provide testResults only for tests type', async () => {
      const preReqResult = await executeScript('', createBaseContext(), 'pre-request')
      expect(preReqResult.testResults).toBeUndefined()

      const testResult = await executeScript('', createBaseContext(), 'tests')
      expect(testResult.testResults).toEqual([])
    })
  })

  describe('pm.environment', () => {
    it('should get environment values', async () => {
      const result = await executeScript(
        'console.log(pm.environment.get("BASE_URL"))',
        createBaseContext(),
        'pre-request'
      )

      expect(result.logs[0].args).toEqual(['https://api.example.com'])
    })

    it('should set environment values', async () => {
      const result = await executeScript(
        'pm.environment.set("NEW_VAR", "new_value")',
        createBaseContext(),
        'pre-request'
      )

      expect(result.environment.NEW_VAR).toBe('new_value')
    })

    it('should convert values to string when setting', async () => {
      const result = await executeScript(
        'pm.environment.set("NUM", 42)',
        createBaseContext(),
        'pre-request'
      )

      expect(result.environment.NUM).toBe('42')
    })

    it('should check has correctly', async () => {
      const result = await executeScript(
        'console.log(pm.environment.has("BASE_URL"), pm.environment.has("MISSING"))',
        createBaseContext(),
        'pre-request'
      )

      expect(result.logs[0].args).toEqual([true, false])
    })

    it('should unset environment values', async () => {
      const result = await executeScript(
        'pm.environment.unset("BASE_URL")',
        createBaseContext(),
        'pre-request'
      )

      expect(result.environment.BASE_URL).toBeUndefined()
    })
  })

  describe('pm.variables', () => {
    it('should get and set variables', async () => {
      const result = await executeScript(
        `
        console.log(pm.variables.get("userId"))
        pm.variables.set("newVar", "hello")
        `,
        createBaseContext(),
        'pre-request'
      )

      expect(result.logs[0].args).toEqual(['123'])
      expect(result.variables.newVar).toBe('hello')
    })

    it('should check has and unset', async () => {
      const result = await executeScript(
        `
        console.log(pm.variables.has("userId"))
        pm.variables.unset("userId")
        console.log(pm.variables.has("userId"))
        `,
        createBaseContext(),
        'pre-request'
      )

      expect(result.logs[0].args).toEqual([true])
      expect(result.logs[1].args).toEqual([false])
    })
  })

  describe('pm.request', () => {
    it('should modify request URL', async () => {
      const result = await executeScript(
        'pm.request.url = "https://new-url.com"',
        createBaseContext(),
        'pre-request'
      )

      expect(result.request.url).toBe('https://new-url.com')
    })

    it('should modify request method', async () => {
      const result = await executeScript(
        'pm.request.method = "POST"',
        createBaseContext(),
        'pre-request'
      )

      expect(result.request.method).toBe('POST')
    })

    it('should add and get headers', async () => {
      const result = await executeScript(
        `
        pm.request.headers.add("X-Custom", "value")
        console.log(pm.request.headers.get("X-Custom"))
        `,
        createBaseContext(),
        'pre-request'
      )

      expect(result.logs[0].args).toEqual(['value'])
    })

    it('should remove headers', async () => {
      const result = await executeScript(
        `
        pm.request.headers.remove("Content-Type")
        console.log(pm.request.headers.get("Content-Type"))
        `,
        createBaseContext(),
        'pre-request'
      )

      expect(result.logs[0].args).toEqual([undefined])
    })
  })

  describe('pm.response', () => {
    const contextWithResponse = createBaseContext({
      response: {
        code: 200,
        status: 'OK',
        responseTime: 150,
        headers: { 'content-type': 'application/json' },
        body: '{"name": "John"}',
      },
    })

    it('should provide response properties', async () => {
      const result = await executeScript(
        'console.log(pm.response.code, pm.response.status, pm.response.responseTime)',
        contextWithResponse,
        'tests'
      )

      expect(result.logs[0].args).toEqual([200, 'OK', 150])
    })

    it('should return text body', async () => {
      const result = await executeScript(
        'console.log(pm.response.text())',
        contextWithResponse,
        'tests'
      )

      expect(result.logs[0].args).toEqual(['{"name": "John"}'])
    })

    it('should parse json body', async () => {
      const result = await executeScript(
        'console.log(JSON.stringify(pm.response.json()))',
        contextWithResponse,
        'tests'
      )

      expect(result.logs[0].args).toEqual(['{"name":"John"}'])
    })

    it('should throw on invalid json', async () => {
      const ctx = createBaseContext({
        response: {
          code: 200,
          status: 'OK',
          responseTime: 100,
          headers: {},
          body: 'not json',
        },
      })

      const result = await executeScript(
        'try { pm.response.json() } catch(e) { console.log(e.message) }',
        ctx,
        'tests'
      )

      expect(result.logs[0].args[0]).toContain('not valid JSON')
    })
  })

  describe('pm.test', () => {
    const contextWithResponse = createBaseContext({
      response: {
        code: 200,
        status: 'OK',
        responseTime: 150,
        headers: {},
        body: '{"name": "John"}',
      },
    })

    it('should record passing test', async () => {
      const result = await executeScript(
        'pm.test("Status is 200", function() { pm.expect(pm.response.code).to.equal(200) })',
        contextWithResponse,
        'tests'
      )

      expect(result.testResults).toHaveLength(1)
      expect(result.testResults![0].name).toBe('Status is 200')
      expect(result.testResults![0].passed).toBe(true)
    })

    it('should record failing test', async () => {
      const result = await executeScript(
        'pm.test("Status is 404", function() { pm.expect(pm.response.code).to.equal(404) })',
        contextWithResponse,
        'tests'
      )

      expect(result.testResults).toHaveLength(1)
      expect(result.testResults![0].passed).toBe(false)
      expect(result.testResults![0].error).toBeDefined()
    })

    it('should run multiple tests independently', async () => {
      const result = await executeScript(
        `
        pm.test("Test 1", function() { pm.expect(true).to.be.true })
        pm.test("Test 2", function() { pm.expect(false).to.be.true })
        pm.test("Test 3", function() { pm.expect(true).to.be.true })
        `,
        contextWithResponse,
        'tests'
      )

      expect(result.testResults).toHaveLength(3)
      expect(result.testResults![0].passed).toBe(true)
      expect(result.testResults![1].passed).toBe(false)
      expect(result.testResults![2].passed).toBe(true)
    })
  })

  describe('pm.expect assertions', () => {
    const ctx = createBaseContext({
      response: {
        code: 200,
        status: 'OK',
        responseTime: 150,
        headers: {},
        body: '{}',
      },
    })

    it('to.equal should pass for matching values', async () => {
      const result = await executeScript(
        'pm.test("equal", () => { pm.expect(5).to.equal(5) })',
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
    })

    it('to.equal should fail for non-matching values', async () => {
      const result = await executeScript(
        'pm.test("equal", () => { pm.expect(5).to.equal(6) })',
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(false)
    })

    it('to.be.below should work', async () => {
      const result = await executeScript(
        'pm.test("below", () => { pm.expect(5).to.be.below(10) })',
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
    })

    it('to.be.above should work', async () => {
      const result = await executeScript(
        'pm.test("above", () => { pm.expect(10).to.be.above(5) })',
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
    })

    it('to.be.ok should check truthiness', async () => {
      const result = await executeScript(
        `
        pm.test("ok true", () => { pm.expect(1).to.be.ok })
        pm.test("ok false", () => { pm.expect(0).to.be.ok })
        `,
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
      expect(result.testResults![1].passed).toBe(false)
    })

    it('to.be.true and to.be.false should work', async () => {
      const result = await executeScript(
        `
        pm.test("true", () => { pm.expect(true).to.be.true })
        pm.test("false", () => { pm.expect(false).to.be.false })
        `,
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
      expect(result.testResults![1].passed).toBe(true)
    })

    it('to.have.property should check object properties', async () => {
      const result = await executeScript(
        `
        pm.test("has prop", () => { pm.expect({a: 1}).to.have.property("a") })
        pm.test("missing prop", () => { pm.expect({a: 1}).to.have.property("b") })
        `,
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
      expect(result.testResults![1].passed).toBe(false)
    })

    it('to.include should work with strings', async () => {
      const result = await executeScript(
        'pm.test("include", () => { pm.expect("hello world").to.include("world") })',
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
    })

    it('to.include should work with arrays', async () => {
      const result = await executeScript(
        'pm.test("include", () => { pm.expect([1, 2, 3]).to.include(2) })',
        ctx, 'tests'
      )
      expect(result.testResults![0].passed).toBe(true)
    })
  })

  describe('console methods', () => {
    it('should capture all log types', async () => {
      const result = await executeScript(
        `
        console.log("log message")
        console.error("error message")
        console.warn("warn message")
        console.info("info message")
        `,
        createBaseContext(),
        'pre-request'
      )

      expect(result.logs).toHaveLength(4)
      expect(result.logs[0]).toEqual({ type: 'log', args: ['log message'] })
      expect(result.logs[1]).toEqual({ type: 'error', args: ['error message'] })
      expect(result.logs[2]).toEqual({ type: 'warn', args: ['warn message'] })
      expect(result.logs[3]).toEqual({ type: 'info', args: ['info message'] })
    })
  })

  describe('runPreRequestScript', () => {
    it('should execute script with request context', async () => {
      const result = await runPreRequestScript(
        'pm.request.url = pm.environment.get("BASE_URL") + "/modified"',
        { url: 'https://old.com', method: 'GET', headers: {} },
        { BASE_URL: 'https://api.example.com' }
      )

      expect(result.success).toBe(true)
      expect(result.request.url).toBe('https://api.example.com/modified')
    })
  })

  describe('runTestScript', () => {
    it('should execute test script with response context', async () => {
      const result = await runTestScript(
        'pm.test("Status OK", () => { pm.expect(pm.response.code).to.equal(200) })',
        { url: 'https://api.com', method: 'GET', headers: {} },
        { code: 200, status: 'OK', responseTime: 100, headers: {}, body: '' },
        {}
      )

      expect(result.success).toBe(true)
      expect(result.testResults).toHaveLength(1)
      expect(result.testResults![0].passed).toBe(true)
    })
  })

  describe('Postman compatibility variables', () => {
    it('should provide responseBody, responseCode, responseTime', async () => {
      const ctx = createBaseContext({
        response: {
          code: 201,
          status: 'Created',
          responseTime: 250,
          headers: {},
          body: '{"id": 1}',
        },
      })

      const result = await executeScript(
        'console.log(responseCode, responseTime, responseBody)',
        ctx,
        'tests'
      )

      expect(result.logs[0].args).toEqual([201, 250, '{"id": 1}'])
    })
  })
})
