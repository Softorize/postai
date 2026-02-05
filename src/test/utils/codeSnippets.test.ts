import { describe, it, expect } from 'vitest'
import { generateCodeSnippet, RequestConfig, LANGUAGE_OPTIONS } from '@/utils/codeSnippets'

const createBaseConfig = (overrides: Partial<RequestConfig> = {}): RequestConfig => ({
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: [],
  params: [],
  ...overrides,
})

describe('Code Snippets', () => {
  describe('LANGUAGE_OPTIONS', () => {
    it('should have unique ids', () => {
      const ids = LANGUAGE_OPTIONS.map(o => o.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('generateCodeSnippet', () => {
    it('should return error message for unknown language', () => {
      const result = generateCodeSnippet('unknown-lang', createBaseConfig())
      expect(result).toContain('not yet implemented')
    })

    it('should generate code for all known language IDs', () => {
      LANGUAGE_OPTIONS.forEach(lang => {
        const result = generateCodeSnippet(lang.id, createBaseConfig())
        expect(result.length).toBeGreaterThan(0)
        expect(result).not.toContain('not yet implemented')
      })
    })
  })

  describe('buildUrl', () => {
    it('should append query params to URL', () => {
      const config = createBaseConfig({
        params: [
          { key: 'page', value: '1', enabled: true },
          { key: 'limit', value: '10', enabled: true },
        ],
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('page=1')
      expect(result).toContain('limit=10')
    })

    it('should skip disabled params', () => {
      const config = createBaseConfig({
        params: [
          { key: 'active', value: 'true', enabled: true },
          { key: 'disabled', value: 'false', enabled: false },
        ],
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('active=true')
      expect(result).not.toContain('disabled=false')
    })

    it('should skip params without key', () => {
      const config = createBaseConfig({
        params: [
          { key: '', value: 'no-key', enabled: true },
          { key: 'valid', value: 'yes', enabled: true },
        ],
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).not.toContain('no-key')
      expect(result).toContain('valid=yes')
    })

    it('should encode special characters in params', () => {
      const config = createBaseConfig({
        params: [
          { key: 'q', value: 'hello world', enabled: true },
        ],
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('hello%20world')
    })

    it('should append to URL with existing query string', () => {
      const config = createBaseConfig({
        url: 'https://api.example.com/users?existing=1',
        params: [{ key: 'new', value: '2', enabled: true }],
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('existing=1&new=2')
    })
  })

  describe('getHeaders with auth', () => {
    it('should add Basic auth header', () => {
      const config = createBaseConfig({
        auth: {
          type: 'basic',
          basic: { username: 'user', password: 'pass' },
        },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('Authorization')
      expect(result).toContain('Basic')
    })

    it('should add Bearer auth header', () => {
      const config = createBaseConfig({
        auth: {
          type: 'bearer',
          bearer: { token: 'my-token-123' },
        },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('Bearer my-token-123')
    })

    it('should add API key header', () => {
      const config = createBaseConfig({
        auth: {
          type: 'apikey',
          apikey: { key: 'X-API-Key', value: 'secret-key', in: 'header' },
        },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('X-API-Key')
      expect(result).toContain('secret-key')
    })

    it('should not add apikey header when in=query', () => {
      const config = createBaseConfig({
        auth: {
          type: 'apikey',
          apikey: { key: 'api_key', value: 'secret', in: 'query' },
        },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).not.toContain('api_key: secret')
    })

    it('should skip auth with no type', () => {
      const config = createBaseConfig({
        auth: { type: 'none' },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).not.toContain('Authorization')
    })
  })

  describe('getBodyContent', () => {
    it('should handle raw JSON body', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: { mode: 'raw', raw: '{"name": "John"}', language: 'json' },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('Content-Type: application/json')
      expect(result).toContain('{"name": "John"}')
    })

    it('should handle raw XML body', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: { mode: 'raw', raw: '<user>John</user>', language: 'xml' },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('Content-Type: application/xml')
    })

    it('should handle urlencoded body', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: {
          mode: 'urlencoded',
          urlencoded: [
            { key: 'username', value: 'john', enabled: true },
            { key: 'password', value: 'pass', enabled: true },
          ],
        },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('application/x-www-form-urlencoded')
      expect(result).toContain('username')
      expect(result).toContain('john')
    })

    it('should handle graphql body', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: {
          mode: 'graphql',
          graphql: { query: '{ users { id name } }', variables: '' },
        },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('application/json')
      expect(result).toContain('query')
    })

    it('should handle formdata body', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: {
          mode: 'formdata',
          formdata: [
            { key: 'name', value: 'John', enabled: true, type: 'text' },
            { key: 'file', value: '', enabled: true, type: 'file', src: '/path/to/file.txt' },
          ],
        },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('--form')
      expect(result).toContain('name')
    })

    it('should skip empty raw body', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: { mode: 'raw', raw: '   ', language: 'text' },
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).not.toContain('--data')
    })

    it('should return null for no body', () => {
      const config = createBaseConfig({ method: 'GET' })

      const result = generateCodeSnippet('curl', config)
      expect(result).not.toContain('--data')
    })
  })

  describe('cURL generator', () => {
    it('should generate basic GET request', () => {
      const result = generateCodeSnippet('curl', createBaseConfig())

      expect(result).toContain('curl')
      expect(result).toContain('--location')
      expect(result).toContain('https://api.example.com/users')
      expect(result).not.toContain('--request') // GET is default
    })

    it('should add --request for non-GET methods', () => {
      const result = generateCodeSnippet('curl', createBaseConfig({ method: 'POST' }))
      expect(result).toContain('--request POST')
    })

    it('should include custom headers', () => {
      const config = createBaseConfig({
        headers: [
          { key: 'X-Custom', value: 'test', enabled: true },
          { key: 'Accept', value: 'application/json', enabled: true },
        ],
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain("--header 'X-Custom: test'")
      expect(result).toContain("--header 'Accept: application/json'")
    })

    it('should skip disabled headers', () => {
      const config = createBaseConfig({
        headers: [
          { key: 'Active', value: 'yes', enabled: true },
          { key: 'Disabled', value: 'no', enabled: false },
        ],
      })

      const result = generateCodeSnippet('curl', config)
      expect(result).toContain('Active')
      expect(result).not.toContain('Disabled')
    })
  })

  describe('JavaScript Fetch generator', () => {
    it('should generate basic fetch code', () => {
      const result = generateCodeSnippet('javascript-fetch', createBaseConfig())

      expect(result).toContain('fetch(')
      expect(result).toContain("method: 'GET'")
      expect(result).toContain('.then(response => response.text())')
    })

    it('should include headers in fetch options', () => {
      const config = createBaseConfig({
        headers: [{ key: 'Accept', value: 'text/html', enabled: true }],
      })

      const result = generateCodeSnippet('javascript-fetch', config)
      expect(result).toContain('Accept')
      expect(result).toContain('text/html')
    })

    it('should include body for POST', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: { mode: 'raw', raw: '{"key": "value"}', language: 'json' },
      })

      const result = generateCodeSnippet('javascript-fetch', config)
      expect(result).toContain('body:')
    })
  })

  describe('Python Requests generator', () => {
    it('should generate basic request', () => {
      const result = generateCodeSnippet('python-requests', createBaseConfig())

      expect(result).toContain('import requests')
      expect(result).toContain('requests.get(')
      expect(result).toContain('print(response.text)')
    })

    it('should include headers dict', () => {
      const config = createBaseConfig({
        headers: [{ key: 'Authorization', value: 'Bearer tok', enabled: true }],
      })

      const result = generateCodeSnippet('python-requests', config)
      expect(result).toContain('headers')
      expect(result).toContain('Authorization')
    })

    it('should handle POST with JSON body', () => {
      const config = createBaseConfig({
        method: 'POST',
        body: { mode: 'raw', raw: '{"name": "test"}', language: 'json' },
      })

      const result = generateCodeSnippet('python-requests', config)
      expect(result).toContain('import json')
      expect(result).toContain('requests.post(')
      expect(result).toContain('data=payload')
    })
  })

  describe('escapeShell', () => {
    it('should escape single quotes in cURL', () => {
      const config = createBaseConfig({
        url: "https://api.example.com/search?q=it's",
      })

      const result = generateCodeSnippet('curl', config)
      // Single quotes should be escaped
      expect(result).toContain("'\\''")
    })
  })

  describe('Other generators basic output', () => {
    const config = createBaseConfig({
      method: 'POST',
      headers: [{ key: 'X-Test', value: 'value', enabled: true }],
      body: { mode: 'raw', raw: '{"test": true}', language: 'json' },
    })

    it('wget should generate output', () => {
      const result = generateCodeSnippet('wget', config)
      expect(result).toContain('wget')
      expect(result).toContain('--method=POST')
    })

    it('httpie should generate output', () => {
      const result = generateCodeSnippet('httpie', config)
      expect(result).toContain('http')
      expect(result).toContain('POST')
    })

    it('http raw should generate output', () => {
      const result = generateCodeSnippet('http', config)
      expect(result).toContain('POST')
      expect(result).toContain('HTTP/1.1')
    })

    it('javascript-axios should generate output', () => {
      const result = generateCodeSnippet('javascript-axios', config)
      expect(result).toContain('axios(')
      expect(result).toContain("method: 'post'")
    })

    it('javascript-xhr should generate output', () => {
      const result = generateCodeSnippet('javascript-xhr', config)
      expect(result).toContain('XMLHttpRequest')
      expect(result).toContain("'POST'")
    })

    it('javascript-jquery should generate output', () => {
      const result = generateCodeSnippet('javascript-jquery', config)
      expect(result).toContain('$.ajax')
    })

    it('nodejs-fetch should generate output', () => {
      const result = generateCodeSnippet('nodejs-fetch', config)
      expect(result).toContain('fetch(')
      expect(result).toContain('Node.js 18+')
    })

    it('nodejs-axios should generate output', () => {
      const result = generateCodeSnippet('nodejs-axios', config)
      expect(result).toContain("require('axios')")
    })

    it('nodejs-native should generate output', () => {
      const result = generateCodeSnippet('nodejs-native', config)
      expect(result).toContain("require('https')")
    })

    it('nodejs-request should generate output', () => {
      const result = generateCodeSnippet('nodejs-request', config)
      expect(result).toContain("require('request')")
    })

    it('python-http should generate output', () => {
      const result = generateCodeSnippet('python-http', config)
      expect(result).toContain('http.client')
    })

    it('php-curl should generate output', () => {
      const result = generateCodeSnippet('php-curl', config)
      expect(result).toContain('curl_init')
    })

    it('php-guzzle should generate output', () => {
      const result = generateCodeSnippet('php-guzzle', config)
      expect(result).toContain('GuzzleHttp')
    })

    it('go-native should generate output', () => {
      const result = generateCodeSnippet('go-native', config)
      expect(result).toContain('net/http')
    })

    it('ruby-nethttp should generate output', () => {
      const result = generateCodeSnippet('ruby-nethttp', config)
      expect(result).toContain("require 'net/http'")
    })

    it('java-okhttp should generate output', () => {
      const result = generateCodeSnippet('java-okhttp', config)
      expect(result).toContain('OkHttpClient')
    })

    it('java-unirest should generate output', () => {
      const result = generateCodeSnippet('java-unirest', config)
      expect(result).toContain('Unirest')
    })

    it('java-httpurlconnection should generate output', () => {
      const result = generateCodeSnippet('java-httpurlconnection', config)
      expect(result).toContain('HttpURLConnection')
    })

    it('csharp-httpclient should generate output', () => {
      const result = generateCodeSnippet('csharp-httpclient', config)
      expect(result).toContain('HttpClient')
    })

    it('csharp-restsharp should generate output', () => {
      const result = generateCodeSnippet('csharp-restsharp', config)
      expect(result).toContain('RestClient')
    })

    it('swift-urlsession should generate output', () => {
      const result = generateCodeSnippet('swift-urlsession', config)
      expect(result).toContain('URLSession')
    })

    it('kotlin-okhttp should generate output', () => {
      const result = generateCodeSnippet('kotlin-okhttp', config)
      expect(result).toContain('OkHttpClient')
    })

    it('dart-http should generate output', () => {
      const result = generateCodeSnippet('dart-http', config)
      expect(result).toContain("'package:http/http.dart'")
    })

    it('dart-dio should generate output', () => {
      const result = generateCodeSnippet('dart-dio', config)
      expect(result).toContain("'package:dio/dio.dart'")
    })

    it('powershell-restmethod should generate output', () => {
      const result = generateCodeSnippet('powershell-restmethod', config)
      expect(result).toContain('Invoke-RestMethod')
    })

    it('powershell-webrequest should generate output', () => {
      const result = generateCodeSnippet('powershell-webrequest', config)
      expect(result).toContain('Invoke-WebRequest')
    })

    it('r-httr should generate output', () => {
      const result = generateCodeSnippet('r-httr', config)
      expect(result).toContain('library(httr)')
    })

    it('rust-reqwest should generate output', () => {
      const result = generateCodeSnippet('rust-reqwest', config)
      expect(result).toContain('reqwest')
    })
  })
})
