import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Environment } from '@/types'

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

// Helper to create mock environment with minimal required fields for testing
const createMockEnv = (overrides: Partial<Environment> = {}): Environment => ({
  id: 'env-1',
  name: 'Test',
  description: '',
  is_active: true,
  variables: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// Helper to create mock variable with minimal required fields for testing
const createMockVariable = (overrides: Record<string, unknown> = {}) => ({
  id: 'v1',
  environment: 'env-1',
  key: 'test',
  values: ['value'],
  selected_value_index: 0,
  description: '',
  is_secret: false,
  enabled: true,
  order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

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
      const mockDuplicatedEnv = createMockEnv({
        id: 'env-2',
        name: 'Test Environment (Copy)',
        is_active: false,
      })
      vi.mocked(api.post).mockResolvedValue({ data: mockDuplicatedEnv })

      const result = await useEnvironmentsStore.getState().duplicateEnvironment('env-1')

      expect(api.post).toHaveBeenCalledWith('/environments/env-1/duplicate/')
      expect(result).toEqual(mockDuplicatedEnv)
    })

    it('should add duplicated environment to state', async () => {
      const existingEnv = createMockEnv({ id: 'env-1', name: 'Test' })
      const mockDuplicatedEnv = createMockEnv({
        id: 'env-2',
        name: 'Test (Copy)',
        is_active: false,
      })

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
      const env = createMockEnv({
        variables: [createMockVariable({ key: 'username', values: ['john'] })]
      }) as Environment
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Hello {{username}}!')
      expect(result).toBe('Hello john!')
    })

    it('should resolve multiple variables', () => {
      const env = createMockEnv({
        variables: [
          createMockVariable({ id: 'v1', key: 'host', values: ['api.example.com'] }),
          createMockVariable({ id: 'v2', key: 'port', values: ['8080'] })
        ]
      }) as Environment
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('https://{{host}}:{{port}}/api')
      expect(result).toBe('https://api.example.com:8080/api')
    })

    it('should use selected value from multi-value variable', () => {
      const env = createMockEnv({
        variables: [createMockVariable({ key: 'env', values: ['dev', 'staging', 'prod'], selected_value_index: 1 })]
      }) as Environment
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Environment: {{env}}')
      expect(result).toBe('Environment: staging')
    })

    it('should not resolve disabled variables', () => {
      const env = createMockEnv({
        variables: [createMockVariable({ key: 'disabled', values: ['value'], enabled: false })]
      }) as Environment
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Test {{disabled}}')
      expect(result).toBe('Test {{disabled}}')
    })

    it('should leave unknown variables unchanged', () => {
      const env = createMockEnv({ variables: [] })
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
      const env = createMockEnv({
        variables: [createMockVariable({ key: 'empty', values: [''] })]
      }) as Environment
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().resolveVariables('Value: [{{empty}}]')
      expect(result).toBe('Value: []')
    })
  })

  describe('getVariableValue', () => {
    it('should return value for existing variable', () => {
      const env = createMockEnv({
        variables: [createMockVariable({ key: 'apiKey', values: ['secret123'] })]
      }) as Environment
      useEnvironmentsStore.setState({ activeEnvironment: env })

      const result = useEnvironmentsStore.getState().getVariableValue('apiKey')
      expect(result).toBe('secret123')
    })

    it('should return null for non-existent variable', () => {
      const env = createMockEnv({ variables: [] })
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

  describe('Collection-Scoped Environments', () => {
    describe('resolveVariables with collection environment priority', () => {
      it('should prioritize collection environment over global', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'base_url', values: ['https://global.api.com'] })]
        }) as Environment
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: [createMockVariable({ id: 'v2', key: 'base_url', values: ['https://collection.api.com'] })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().resolveVariables('{{base_url}}/users', collectionEnv)
        expect(result).toBe('https://collection.api.com/users')
      })

      it('should fall back to global environment when variable not in collection', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [
            createMockVariable({ id: 'v1', key: 'api_key', values: ['global-key'] }),
            createMockVariable({ id: 'v2', key: 'base_url', values: ['https://global.api.com'] })
          ]
        }) as Environment
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: [createMockVariable({ id: 'v3', key: 'base_url', values: ['https://collection.api.com'] })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        // base_url from collection, api_key from global
        const result = useEnvironmentsStore.getState().resolveVariables('{{base_url}}?key={{api_key}}', collectionEnv)
        expect(result).toBe('https://collection.api.com?key=global-key')
      })

      it('should skip disabled variables in collection environment', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'token', values: ['global-token'] })]
        }) as Environment
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: [createMockVariable({ id: 'v2', key: 'token', values: ['collection-token'], enabled: false })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().resolveVariables('Bearer {{token}}', collectionEnv)
        expect(result).toBe('Bearer global-token')
      })

      it('should use correct selected_value_index from collection environment', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'user', values: ['global-user'] })]
        }) as Environment
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: [createMockVariable({
            id: 'v2',
            key: 'user',
            values: ['user1', 'user2', 'user3'],
            selected_value_index: 2
          })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().resolveVariables('User: {{user}}', collectionEnv)
        expect(result).toBe('User: user3')
      })

      it('should work with null collection environment', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'host', values: ['global.host.com'] })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().resolveVariables('https://{{host}}', null)
        expect(result).toBe('https://global.host.com')
      })

      it('should work with undefined collection environment', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'host', values: ['global.host.com'] })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().resolveVariables('https://{{host}}', undefined)
        expect(result).toBe('https://global.host.com')
      })
    })

    describe('getVariableValue with collection environment priority', () => {
      it('should prioritize collection environment over global', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'secret', values: ['global-secret'] })]
        }) as Environment
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: [createMockVariable({ id: 'v2', key: 'secret', values: ['collection-secret'] })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().getVariableValue('secret', collectionEnv)
        expect(result).toBe('collection-secret')
      })

      it('should fall back to global when variable not in collection', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'global_only', values: ['global-value'] })]
        }) as Environment
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: []
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().getVariableValue('global_only', collectionEnv)
        expect(result).toBe('global-value')
      })

      it('should return null when variable not found in either environment', () => {
        const globalEnv = createMockEnv({ id: 'global-env', variables: [] })
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: []
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().getVariableValue('nonexistent', collectionEnv)
        expect(result).toBeNull()
      })

      it('should skip disabled collection variables and use global', () => {
        const globalEnv = createMockEnv({
          id: 'global-env',
          variables: [createMockVariable({ key: 'config', values: ['global-config'] })]
        }) as Environment
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1',
          variables: [createMockVariable({ id: 'v2', key: 'config', values: ['collection-config'], enabled: false })]
        }) as Environment

        useEnvironmentsStore.setState({ activeEnvironment: globalEnv })

        const result = useEnvironmentsStore.getState().getVariableValue('config', collectionEnv)
        expect(result).toBe('global-config')
      })
    })

    describe('getGlobalEnvironments', () => {
      it('should return only environments without collection', () => {
        const globalEnv1 = createMockEnv({ id: 'global-1', name: 'Global 1' })
        const globalEnv2 = createMockEnv({ id: 'global-2', name: 'Global 2' })
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          name: 'Collection Env',
          collection: 'collection-1'
        })

        useEnvironmentsStore.setState({
          environments: [globalEnv1, collectionEnv, globalEnv2]
        })

        const result = useEnvironmentsStore.getState().getGlobalEnvironments()
        expect(result).toHaveLength(2)
        expect(result.map(e => e.id)).toEqual(['global-1', 'global-2'])
      })

      it('should return empty array when no global environments', () => {
        const collectionEnv = createMockEnv({
          id: 'collection-env',
          collection: 'collection-1'
        })

        useEnvironmentsStore.setState({ environments: [collectionEnv] })

        const result = useEnvironmentsStore.getState().getGlobalEnvironments()
        expect(result).toHaveLength(0)
      })

      it('should return all environments when none are collection-scoped', () => {
        const env1 = createMockEnv({ id: 'env-1' })
        const env2 = createMockEnv({ id: 'env-2' })

        useEnvironmentsStore.setState({ environments: [env1, env2] })

        const result = useEnvironmentsStore.getState().getGlobalEnvironments()
        expect(result).toHaveLength(2)
      })
    })

    describe('getCollectionEnvironments', () => {
      it('should return only environments for specific collection', () => {
        const globalEnv = createMockEnv({ id: 'global-env' })
        const collEnv1 = createMockEnv({
          id: 'coll-env-1',
          collection: 'collection-1'
        })
        const collEnv2 = createMockEnv({
          id: 'coll-env-2',
          collection: 'collection-1'
        })
        const otherCollEnv = createMockEnv({
          id: 'other-coll-env',
          collection: 'collection-2'
        })

        useEnvironmentsStore.setState({
          environments: [globalEnv, collEnv1, collEnv2, otherCollEnv]
        })

        const result = useEnvironmentsStore.getState().getCollectionEnvironments('collection-1')
        expect(result).toHaveLength(2)
        expect(result.map(e => e.id)).toEqual(['coll-env-1', 'coll-env-2'])
      })

      it('should return empty array when collection has no environments', () => {
        const globalEnv = createMockEnv({ id: 'global-env' })
        const otherCollEnv = createMockEnv({
          id: 'other-coll-env',
          collection: 'collection-2'
        })

        useEnvironmentsStore.setState({
          environments: [globalEnv, otherCollEnv]
        })

        const result = useEnvironmentsStore.getState().getCollectionEnvironments('collection-1')
        expect(result).toHaveLength(0)
      })
    })

    describe('createEnvironment with collectionId', () => {
      it('should create global environment without collectionId', async () => {
        const mockEnv = createMockEnv({ id: 'new-env', name: 'New Global' })
        vi.mocked(api.post).mockResolvedValue({ data: mockEnv })

        await useEnvironmentsStore.getState().createEnvironment('New Global', 'description')

        expect(api.post).toHaveBeenCalledWith('/environments/', {
          name: 'New Global',
          description: 'description'
        })
      })

      it('should create collection-scoped environment with collectionId', async () => {
        const mockEnv = createMockEnv({
          id: 'new-env',
          name: 'Collection Env',
          collection: 'collection-1'
        })
        vi.mocked(api.post).mockResolvedValue({ data: mockEnv })

        await useEnvironmentsStore.getState().createEnvironment('Collection Env', 'description', 'collection-1')

        expect(api.post).toHaveBeenCalledWith('/environments/', {
          name: 'Collection Env',
          description: 'description',
          collection: 'collection-1'
        })
      })

      it('should add created collection environment to state', async () => {
        const mockEnv = createMockEnv({
          id: 'new-env',
          name: 'Collection Env',
          collection: 'collection-1'
        })
        vi.mocked(api.post).mockResolvedValue({ data: mockEnv })

        await useEnvironmentsStore.getState().createEnvironment('Collection Env', '', 'collection-1')

        const state = useEnvironmentsStore.getState()
        expect(state.environments).toContainEqual(mockEnv)
      })
    })

    describe('fetchGlobalEnvironments', () => {
      it('should call API with global_only param', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        await useEnvironmentsStore.getState().fetchGlobalEnvironments()

        expect(api.get).toHaveBeenCalledWith('/environments/', {
          params: { global_only: 'true', workspace: 'workspace-1' }
        })
      })

      it('should return global environments from API', async () => {
        const globalEnvs = [
          createMockEnv({ id: 'global-1' }),
          createMockEnv({ id: 'global-2' })
        ]
        vi.mocked(api.get).mockResolvedValue({ data: globalEnvs })

        const result = await useEnvironmentsStore.getState().fetchGlobalEnvironments()

        expect(result).toEqual(globalEnvs)
      })

      it('should return empty array on error', async () => {
        vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

        const result = await useEnvironmentsStore.getState().fetchGlobalEnvironments()

        expect(result).toEqual([])
      })
    })

    describe('duplicateEnvironment preserves collection', () => {
      it('should duplicate collection environment with collection preserved', async () => {
        const existingEnv = createMockEnv({
          id: 'coll-env-1',
          name: 'Collection Env',
          collection: 'collection-1'
        })
        const duplicatedEnv = createMockEnv({
          id: 'coll-env-2',
          name: 'Collection Env (Copy)',
          collection: 'collection-1',
          is_active: false,
        })

        useEnvironmentsStore.setState({ environments: [existingEnv] })
        vi.mocked(api.post).mockResolvedValue({ data: duplicatedEnv })

        const result = await useEnvironmentsStore.getState().duplicateEnvironment('coll-env-1')

        expect(result.collection).toBe('collection-1')
        expect(api.post).toHaveBeenCalledWith('/environments/coll-env-1/duplicate/')
      })
    })
  })
})
