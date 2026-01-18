import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.electron for tests
vi.stubGlobal('window', {
  ...window,
  electron: {
    django: {
      getBaseUrl: vi.fn().mockResolvedValue('http://localhost:8765'),
      getStatus: vi.fn().mockResolvedValue({ running: true }),
    },
  },
})

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})))

// Mock IntersectionObserver
vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})))
