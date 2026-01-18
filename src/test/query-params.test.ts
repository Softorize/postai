import { describe, it, expect } from 'vitest'

// Query params merging logic (extracted from RequestBuilder)
interface Param {
  key: string
  value: string
  enabled: boolean
}

function mergeQueryParams(
  url: string,
  params: Param[],
  resolveVariables: (text: string) => string = (t) => t
): string {
  let baseUrl = url
  let existingParams = new URLSearchParams()

  // Extract existing query params from URL
  const questionMarkIndex = url.indexOf('?')
  if (questionMarkIndex !== -1) {
    baseUrl = url.substring(0, questionMarkIndex)
    const queryString = url.substring(questionMarkIndex + 1)
    existingParams = new URLSearchParams(queryString)
  }

  // Build params from Params tab (these take precedence)
  const tabParams = new Map<string, string>()
  params.forEach((p) => {
    if (p.enabled && p.key) {
      tabParams.set(resolveVariables(p.key), resolveVariables(p.value))
    }
  })

  // Merge: start with existing URL params, then override with Params tab
  const mergedParams = new URLSearchParams()
  existingParams.forEach((value, key) => {
    // Only add if not overridden by Params tab
    if (!tabParams.has(key)) {
      mergedParams.append(key, value)
    }
  })
  // Add all Params tab entries
  tabParams.forEach((value, key) => {
    mergedParams.append(key, value)
  })

  return mergedParams.toString()
    ? `${baseUrl}?${mergedParams}`
    : baseUrl
}

describe('Query Params Merging', () => {
  describe('mergeQueryParams', () => {
    it('should merge URL params with tab params', () => {
      const url = 'https://api.com/endpoint?existing=value'
      const params: Param[] = [
        { key: 'new', value: 'param', enabled: true }
      ]
      const result = mergeQueryParams(url, params)
      expect(result).toContain('existing=value')
      expect(result).toContain('new=param')
    })

    it('should override URL params with tab params', () => {
      const url = 'https://api.com/endpoint?username=old'
      const params: Param[] = [
        { key: 'username', value: 'new', enabled: true }
      ]
      const result = mergeQueryParams(url, params)
      expect(result).toBe('https://api.com/endpoint?username=new')
      // Should NOT contain the old value
      expect(result).not.toContain('old')
    })

    it('should handle URL with no existing params', () => {
      const url = 'https://api.com/endpoint'
      const params: Param[] = [
        { key: 'foo', value: 'bar', enabled: true }
      ]
      const result = mergeQueryParams(url, params)
      expect(result).toBe('https://api.com/endpoint?foo=bar')
    })

    it('should handle empty params tab', () => {
      const url = 'https://api.com/endpoint?existing=value'
      const params: Param[] = []
      const result = mergeQueryParams(url, params)
      expect(result).toBe('https://api.com/endpoint?existing=value')
    })

    it('should skip disabled params', () => {
      const url = 'https://api.com/endpoint'
      const params: Param[] = [
        { key: 'enabled', value: 'yes', enabled: true },
        { key: 'disabled', value: 'no', enabled: false }
      ]
      const result = mergeQueryParams(url, params)
      expect(result).toContain('enabled=yes')
      expect(result).not.toContain('disabled')
    })

    it('should skip params with empty keys', () => {
      const url = 'https://api.com/endpoint'
      const params: Param[] = [
        { key: '', value: 'nokey', enabled: true },
        { key: 'valid', value: 'value', enabled: true }
      ]
      const result = mergeQueryParams(url, params)
      expect(result).toBe('https://api.com/endpoint?valid=value')
    })

    it('should resolve variables in params', () => {
      const url = 'https://api.com/endpoint'
      const params: Param[] = [
        { key: '{{keyVar}}', value: '{{valueVar}}', enabled: true }
      ]
      const resolveVariables = (text: string) => {
        return text
          .replace('{{keyVar}}', 'username')
          .replace('{{valueVar}}', 'john')
      }
      const result = mergeQueryParams(url, params, resolveVariables)
      expect(result).toBe('https://api.com/endpoint?username=john')
    })

    it('should handle multiple duplicate params (tab wins)', () => {
      const url = 'https://api.com?a=1&b=2&c=3'
      const params: Param[] = [
        { key: 'a', value: 'x', enabled: true },
        { key: 'c', value: 'z', enabled: true }
      ]
      const result = mergeQueryParams(url, params)
      // b should remain, a and c should be overridden
      expect(result).toContain('b=2')
      expect(result).toContain('a=x')
      expect(result).toContain('c=z')
      expect(result).not.toContain('a=1')
      expect(result).not.toContain('c=3')
    })

    it('should handle URL-encoded values properly', () => {
      const url = 'https://api.com/endpoint?email=test%40example.com'
      const params: Param[] = []
      const result = mergeQueryParams(url, params)
      // URLSearchParams decodes, then re-encodes
      expect(result).toContain('email=test%40example.com')
    })

    it('should handle empty URL and empty params', () => {
      const result = mergeQueryParams('', [])
      expect(result).toBe('')
    })

    it('should preserve URL without query when no params', () => {
      const url = 'https://api.com/endpoint'
      const params: Param[] = []
      const result = mergeQueryParams(url, params)
      expect(result).toBe('https://api.com/endpoint')
    })
  })
})
