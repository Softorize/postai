import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Check, AlertCircle, Eye, EyeOff, Github, LogOut, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { useAiStore } from '../../stores/ai.store'
import { AiProviderType, GitHubDeviceCodeResponse } from '../../types'
import { cn } from '../../lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const PROVIDER_TYPES: { value: AiProviderType; label: string; defaultUrl: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)', defaultUrl: '' },
  { value: 'deepseek', label: 'DeepSeek', defaultUrl: 'https://api.deepseek.com/v1' },
  { value: 'openai', label: 'OpenAI', defaultUrl: 'https://api.openai.com/v1' },
  { value: 'copilot', label: 'GitHub Copilot', defaultUrl: 'https://api.githubcopilot.com' },
  { value: 'custom', label: 'Custom Provider', defaultUrl: '' },
]

const DEFAULT_MODELS: Record<AiProviderType, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o',
  copilot: 'gpt-4o',
  custom: '',
}

export function AiProviderSettings({ isOpen, onClose }: Props) {
  const {
    providers,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    testProviderConnection,
    isLoading,
    error,
    setError,
    startGitHubLogin,
    pollGitHubToken,
    stopGitHubPolling,
    logoutGitHub,
    githubDeviceCode,
    githubPolling
  } = useAiStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})
  const [loginProviderId, setLoginProviderId] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider_type: 'anthropic' as AiProviderType,
    api_key: '',
    api_base_url: '',
    default_model: 'claude-sonnet-4-20250514',
    is_active: true,
    max_requests_per_minute: 60
  })

  useEffect(() => {
    if (isOpen) {
      fetchProviders()
    }
  }, [isOpen])

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      stopGitHubPolling()
    }
  }, [])

  // Handle GitHub device flow polling
  useEffect(() => {
    if (githubDeviceCode && loginProviderId && githubPolling) {
      const interval = (githubDeviceCode.interval || 5) * 1000

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const success = await pollGitHubToken(githubDeviceCode.device_code, loginProviderId)
          if (success) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
            setLoginProviderId(null)
          }
        } catch {
          // Error handling is done in the store
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setLoginProviderId(null)
        }
      }, interval)

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    }
  }, [githubDeviceCode, loginProviderId, githubPolling])

  const handleStartGitHubLogin = async (providerId: string) => {
    try {
      setLoginProviderId(providerId)
      await startGitHubLogin()
    } catch {
      setLoginProviderId(null)
    }
  }

  const handleCancelGitHubLogin = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    stopGitHubPolling()
    setLoginProviderId(null)
  }

  const handleCopyCode = async () => {
    if (githubDeviceCode?.user_code) {
      await navigator.clipboard.writeText(githubDeviceCode.user_code)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  const handleGitHubLogout = async (providerId: string) => {
    try {
      await logoutGitHub(providerId)
    } catch {
      // Error handling is done in the store
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      provider_type: 'anthropic',
      api_key: '',
      api_base_url: '',
      default_model: 'claude-sonnet-4-20250514',
      is_active: true,
      max_requests_per_minute: 60
    })
    setEditingId(null)
  }

  const handleProviderTypeChange = (type: AiProviderType) => {
    const providerConfig = PROVIDER_TYPES.find(p => p.value === type)
    setFormData({
      ...formData,
      provider_type: type,
      api_base_url: providerConfig?.defaultUrl || '',
      default_model: DEFAULT_MODELS[type]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateProvider(editingId, formData)
      } else {
        await createProvider(formData)
      }
      resetForm()
    } catch (err) {
      // Error is handled in store
    }
  }

  const handleEdit = (provider: typeof providers[0]) => {
    setEditingId(provider.id)
    setFormData({
      name: provider.name,
      provider_type: provider.provider_type as AiProviderType,
      api_key: '', // Don't show existing key
      api_base_url: provider.api_base_url || '',
      default_model: provider.default_model,
      is_active: provider.is_active,
      max_requests_per_minute: provider.max_requests_per_minute
    })
  }

  const handleTestConnection = async (id: string) => {
    setTestResults({ ...testResults, [id]: null })
    const success = await testProviderConnection(id)
    setTestResults({ ...testResults, [id]: success })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-sidebar border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">AI Provider Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-destructive/70 hover:text-destructive"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* GitHub Device Code Dialog */}
          {githubDeviceCode && loginProviderId && (
            <div className="mb-4 p-4 bg-zinc-900 text-white rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Github className="h-5 w-5" />
                <h4 className="font-semibold">Sign in with GitHub</h4>
              </div>
              <p className="text-sm text-zinc-300 mb-4">
                Enter this code on GitHub to authorize PostAI:
              </p>
              <div className="flex items-center gap-2 mb-4">
                <code className="flex-1 text-center text-2xl font-mono bg-zinc-800 py-3 rounded-md tracking-widest">
                  {githubDeviceCode.user_code}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md"
                  title="Copy code"
                >
                  {codeCopied ? (
                    <Check className="h-5 w-5 text-green-400" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <a
                  href={githubDeviceCode.verification_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-white text-zinc-900 font-medium rounded-md hover:bg-zinc-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open GitHub
                </a>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for authorization...
                </span>
                <button
                  onClick={handleCancelGitHubLogin}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Provider list */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground">Configured Providers</h3>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No providers configured yet.</p>
            ) : (
              providers.map(provider => (
                <div
                  key={provider.id}
                  className={cn(
                    'p-3 border rounded-md',
                    provider.is_active ? 'border-border' : 'border-border/50 opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{provider.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {provider.provider_type} | {provider.default_model}
                        {provider.provider_type === 'copilot' && provider.is_oauth_authenticated && provider.github_username && (
                          <span className="ml-2 text-green-600">
                            • Logged in as @{provider.github_username}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* GitHub OAuth controls for Copilot providers */}
                      {provider.provider_type === 'copilot' && (
                        provider.is_oauth_authenticated ? (
                          <button
                            onClick={() => handleGitHubLogout(provider.id)}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md flex items-center gap-1"
                          >
                            <LogOut className="h-3 w-3" />
                            Logout
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartGitHubLogin(provider.id)}
                            disabled={isLoading || loginProviderId === provider.id}
                            className="px-3 py-1 text-sm bg-zinc-900 text-white hover:bg-zinc-800 rounded-md flex items-center gap-1"
                          >
                            {loginProviderId === provider.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Github className="h-3 w-3" />
                            )}
                            Login with GitHub
                          </button>
                        )
                      )}
                      <button
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={isLoading}
                        className={cn(
                          'px-3 py-1 text-sm rounded-md',
                          testResults[provider.id] === true
                            ? 'bg-green-100 text-green-700'
                            : testResults[provider.id] === false
                            ? 'bg-red-100 text-red-700'
                            : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        {testResults[provider.id] === true ? (
                          <span className="flex items-center gap-1">
                            <Check className="h-3 w-3" /> Connected
                          </span>
                        ) : testResults[provider.id] === false ? (
                          'Failed'
                        ) : (
                          'Test'
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(provider)}
                        className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProvider(provider.id)}
                        className="p-1 hover:bg-destructive/20 rounded-md text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add/Edit form */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {editingId ? 'Edit Provider' : 'Add New Provider'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., My Claude API"
                    className="w-full px-3 py-2 border border-border rounded-md bg-panel text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Provider Type</label>
                  <select
                    value={formData.provider_type}
                    onChange={(e) => handleProviderTypeChange(e.target.value as AiProviderType)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-panel text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {PROVIDER_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey['new'] ? 'text' : 'password'}
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder={editingId ? 'Leave empty to keep current key' : 'sk-...'}
                    className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-panel text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required={!editingId}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey({ ...showApiKey, new: !showApiKey['new'] })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                  >
                    {showApiKey['new'] ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {(formData.provider_type === 'custom' || formData.provider_type === 'deepseek' || formData.provider_type === 'copilot' || formData.provider_type === 'openai') && (
                <div>
                  <label className="block text-sm font-medium mb-1">API Base URL</label>
                  <input
                    type="url"
                    value={formData.api_base_url}
                    onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2 border border-border rounded-md bg-panel text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Default Model</label>
                  <input
                    type="text"
                    value={formData.default_model}
                    onChange={(e) => setFormData({ ...formData, default_model: e.target.value })}
                    placeholder="Model ID"
                    className="w-full px-3 py-2 border border-border rounded-md bg-panel text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Rate Limit (req/min)</label>
                  <input
                    type="number"
                    value={formData.max_requests_per_minute}
                    onChange={(e) => setFormData({ ...formData, max_requests_per_minute: parseInt(e.target.value) })}
                    min={1}
                    max={1000}
                    className="w-full px-3 py-2 border border-border rounded-md bg-panel text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-input"
                />
                <label htmlFor="is_active" className="text-sm">Active</label>
              </div>

              <div className="flex justify-end gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {editingId ? 'Update Provider' : 'Add Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
