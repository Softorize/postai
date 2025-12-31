import { clsx } from 'clsx'
import { AuthConfig, AuthType } from '@/types'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface AuthEditorProps {
  auth?: AuthConfig
  onChange: (auth: AuthConfig | undefined) => void
}

const authTypes: { id: AuthType; label: string; description: string }[] = [
  { id: 'none', label: 'No Auth', description: 'No authentication' },
  { id: 'basic', label: 'Basic Auth', description: 'Username and password' },
  { id: 'bearer', label: 'Bearer Token', description: 'JWT or access token' },
  { id: 'apikey', label: 'API Key', description: 'Key-value in header or query' },
  { id: 'oauth2', label: 'OAuth 2.0', description: 'OAuth 2.0 authentication' },
]

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const currentType = auth?.type || 'none'

  const handleTypeChange = (type: AuthType) => {
    if (type === 'none') {
      onChange(undefined)
    } else {
      onChange({ type } as AuthConfig)
    }
  }

  return (
    <div className="space-y-6">
      {/* Auth type selector */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Type</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {authTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleTypeChange(type.id)}
              className={clsx(
                'px-4 py-3 rounded-lg border text-left transition-colors',
                currentType === type.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-border hover:border-primary-500/50 hover:bg-white/5'
              )}
            >
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Auth config based on type */}
      {currentType === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Username</label>
            <input
              type="text"
              value={auth?.basic?.username || ''}
              onChange={(e) =>
                onChange({
                  type: 'basic',
                  basic: { ...auth?.basic, username: e.target.value, password: auth?.basic?.password || '' },
                })
              }
              placeholder="Enter username"
              className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={auth?.basic?.password || ''}
                onChange={(e) =>
                  onChange({
                    type: 'basic',
                    basic: { username: auth?.basic?.username || '', password: e.target.value },
                  })
                }
                placeholder="Enter password"
                className="w-full px-4 py-2 pr-10 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-text-secondary" />
                ) : (
                  <Eye className="w-4 h-4 text-text-secondary" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentType === 'bearer' && (
        <div>
          <label className="block text-sm text-text-secondary mb-2">Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={auth?.bearer?.token || ''}
              onChange={(e) =>
                onChange({
                  type: 'bearer',
                  bearer: { token: e.target.value },
                })
              }
              placeholder="Enter bearer token"
              className="w-full px-4 py-2 pr-10 bg-sidebar border border-border rounded-lg text-sm font-mono focus:border-primary-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
            >
              {showToken ? (
                <EyeOff className="w-4 h-4 text-text-secondary" />
              ) : (
                <Eye className="w-4 h-4 text-text-secondary" />
              )}
            </button>
          </div>
        </div>
      )}

      {currentType === 'apikey' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Key</label>
            <input
              type="text"
              value={auth?.apikey?.key || ''}
              onChange={(e) =>
                onChange({
                  type: 'apikey',
                  apikey: { ...auth?.apikey, key: e.target.value, value: auth?.apikey?.value || '', in: auth?.apikey?.in || 'header' },
                })
              }
              placeholder="e.g., X-API-Key"
              className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">Value</label>
            <input
              type="text"
              value={auth?.apikey?.value || ''}
              onChange={(e) =>
                onChange({
                  type: 'apikey',
                  apikey: { key: auth?.apikey?.key || '', value: e.target.value, in: auth?.apikey?.in || 'header' },
                })
              }
              placeholder="Enter API key value"
              className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm font-mono focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">Add to</label>
            <select
              value={auth?.apikey?.in || 'header'}
              onChange={(e) =>
                onChange({
                  type: 'apikey',
                  apikey: { key: auth?.apikey?.key || '', value: auth?.apikey?.value || '', in: e.target.value as 'header' | 'query' },
                })
              }
              className="px-4 py-2 bg-sidebar border border-border rounded-lg text-sm"
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
          </div>
        </div>
      )}

      {currentType === 'oauth2' && (
        <div className="text-text-secondary text-sm">
          OAuth 2.0 configuration coming soon...
        </div>
      )}
    </div>
  )
}
