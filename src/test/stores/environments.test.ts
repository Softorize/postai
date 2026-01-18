import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}))

// Mock workspaces store
vi.mock('@/stores/workspaces.store', () => ({
  useWorkspacesStore: {
    getState: () => ({
      activeWorkspace: { id: 'workspace-1' }
    })
  }
}))

import { api } from '@/api/client'
import { useEnvironmentsStore } from '@/stores/environments.store'

describe('Environments Store', () => {
  beforeEach(() => {
    // Reset store state
    useEnvironmentsStore.setState({
      environments: [],
      activeEnvironment: null,
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('duplicateEnvironment', () => {
    it('should call API to duplicate environment', async () => {
      const mockDuplicatedEnv = {
        id: 'env-2',
        name: 'Test Environment (Copy)',
        variables: [],
      }
      vi.mocked(api.post).mockResolvedValue({ data: mockDuplicatedEnv })

      const result = await useEnvironmentsStore.getState().duplicateEnvironment('env-1')

      expect(api.post).toHaveBeenCalledWith('/environments/env-1/duplicate/')
      expect(result).toEqual(mockDuplicatedEnv)
    })

    it('should add duplicated environment to state', async () => {
      const existingEnv = { id: 'env-1', name: 'Test', variables: [] }
      const mockDuplicatedEnv = { id: 'env-2', name: 'Test (Copy)', variables: [] }

      useEnvironmentsStore.setState({ environments: [existingEnv] })
      vi.mocked(api.post).mockResolvedValue({ data: mockDuplicatedEnv })

      await useEnvironmentsStore.getState().duplicateEnvironment('env-1')

      const state = useEnvironmentsStore.getState()
      expect(state.environments).toHaveLength(2)
      expect(state.environments).toContainEqual(mockDuplicatedEnv)
    })
  })

  describe('resolveVariables', () => {
    it('should resolve single variable', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: [
          { id: 'v1', key: 'username', values: ['john'], selected_value_index: 0, enabled: true }
        ]
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Hello {{username}}!')
      expect(result).toBe('Hello john!')
    })

    it('should resolve multiple variables', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: [
          { id: 'v1', key: 'host', values: ['api.example.com'], selected_value_index: 0, enabled: true },
          { id: 'v2', key: 'port', values: ['8080'], selected_value_index: 0, enabled: true }
        ]
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('https://{{host}}:{{port}}/api')
      expect(result).toBe('https://api.example.com:8080/api')
    })

    it('should use selected value from multi-value variable', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: [
          { id: 'v1', key: 'env', values: ['dev', 'staging', 'prod'], selected_value_index: 1, enabled: true }
        ]
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Environment: {{env}}')
      expect(result).toBe('Environment: staging')
    })

    it('should not resolve disabled variables', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: [
          { id: 'v1', key: 'disabled', values: ['value'], selected_value_index: 0, enabled: false }
        ]
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Test {{disabled}}')
      expect(result).toBe('Test {{disabled}}')
    })

    it('should leave unknown variables unchanged', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: []
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Hello {{unknown}}!')
      expect(result).toBe('Hello {{unknown}}!')
    })

    it('should return original text if no active environment', () => {
      useEnvironmentsStore.setState({ activeEnvironment: null })

      const result = useEnvironmentsStore.getState().resolveVariables('Hello {{var}}!')
      expect(result).toBe('Hello {{var}}!')
    })

    it('should handle empty string', () => {
      const result = useEnvironmentsStore.getState().resolveVariables('')
      expect(result).toBe('')
    })

    it('should preserve empty string variable values', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: [
          { id: 'v1', key: 'empty', values: [''], selected_value_index: 0, enabled: true }
        ]
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Value: [{{empty}}]')
      expect(result).toBe('Value: []')
    })
  })

  describe('getVariableValue', () => {
    it('should return value for existing variable', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: [
          { id: 'v1', key: 'apiKey', values: ['secret123'], selected_value_index: 0, enabled: true }
        ]
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().getVariableValue('apiKey')
      expect(result).toBe('secret123')
    })

    it('should return null for non-existent variable', () => {
      const env = {
        id: 'env-1',
        name: 'Test',
        variables: []
      }
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().getVariableValue('nonexistent')
      expect(result).toBeNull()
    })

    it('should return null when no active environment', () => {
      useEnvironmentsStore.setState({ activeEnvironment: null })

      const result = useEnvironmentsStore.getState().getVariableValue('anyKey')
      expect(result).toBeNull()
    })
  })
})
