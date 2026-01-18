import { describe, it, expect } from 'vitest'

// URL utility functions to test (extracted from UrlBar component)
function decodeVariableBraces(text: string): string {
  return text
    .replace(/%7B%7B/gi, '{{')
    .replace(/%7D%7D/gi, '}}')
}

function hasVariables(url: string): boolean {
  return /\{\{[^}]+\}\}/.test(url)
}

describe('URL Utilities', () => {
  describe('decodeVariableBraces', () => {
    it('should decode URL-encoded opening braces', () => {
      expect(decodeVariableBraces('%7B%7Busername%7D%7D')).toBe('{{username}}')
    })

    it('should decode multiple encoded variables', () => {
      const input = 'https://api.com?user=%7B%7Busername%7D%7D&pass=%7B%7Bpassword%7D%7D'
      const expected = 'https://api.com?user={{username}}&pass={{password}}'
      expect(decodeVariableBraces(input)).toBe(expected)
    })

    it('should handle case-insensitive encoding', () => {
      expect(decodeVariableBraces('%7b%7bvar%7d%7d')).toBe('{{var}}')
      expect(decodeVariableBraces('%7B%7Bvar%7D%7D')).toBe('{{var}}')
    })

    it('should leave already decoded braces unchanged', () => {
      expect(decodeVariableBraces('{{username}}')).toBe('{{username}}')
    })

    it('should handle mixed encoded and decoded braces', () => {
      const input = '{{base_url}}/api?user=%7B%7Busername%7D%7D'
      const expected = '{{base_url}}/api?user={{username}}'
      expect(decodeVariableBraces(input)).toBe(expected)
    })

    it('should handle empty string', () => {
      expect(decodeVariableBraces('')).toBe('')
    })

    it('should handle URL with no variables', () => {
      expect(decodeVariableBraces('https://api.com/users')).toBe('https://api.com/users')
    })
  })

  describe('hasVariables', () => {
    it('should detect variables in URL', () => {
      expect(hasVariables('{{base_url}}/api')).toBe(true)
    })

    it('should detect multiple variables', () => {
      expect(hasVariables('{{base}}/{{path}}')).toBe(true)
    })

    it('should return false for URL without variables', () => {
      expect(hasVariables('https://api.com/users')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(hasVariables('')).toBe(false)
    })

    it('should not match incomplete variable syntax', () => {
      expect(hasVariables('{username}')).toBe(false)
      expect(hasVariables('{{username}')).toBe(false)
      expect(hasVariables('{username}}')).toBe(false)
    })

    it('should match variables with various names', () => {
      expect(hasVariables('{{user_name}}')).toBe(true)
      expect(hasVariables('{{userName}}')).toBe(true)
      expect(hasVariables('{{USER_NAME}}')).toBe(true)
      expect(hasVariables('{{user-name}}')).toBe(true)
      expect(hasVariables('{{user.name}}')).toBe(true)
    })
  })
})
