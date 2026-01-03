import { clsx } from 'clsx'
import { AuthConfig, AuthType } from '@/types'
import { Eye, EyeOff, Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/api/client'
import toast from 'react-hot-toast'

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
  { id: 'hmac', label: 'HMAC', description: 'Hash-based signature' },
]

const grantTypes = [
  { id: 'client_credentials', label: 'Client Credentials', description: 'Server-to-server authentication' },
  { id: 'password', label: 'Password', description: 'Username and password grant' },
  { id: 'authorization_code', label: 'Authorization Code', description: 'Browser-based authentication' },
] as const

const hmacAlgorithms = [
  { id: 'sha256', label: 'SHA-256' },
  { id: 'sha512', label: 'SHA-512' },
  { id: 'sha1', label: 'SHA-1' },
  { id: 'md5', label: 'MD5' },
] as const

const hmacComponents = [
  { id: 'method', label: 'HTTP Method' },
  { id: 'path', label: 'URL Path' },
  { id: 'timestamp', label: 'Timestamp' },
  { id: 'body', label: 'Request Body' },
  { id: 'nonce', label: 'Nonce' },
] as const

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [showOAuthPassword, setShowOAuthPassword] = useState(false)
  const [showHmacSecret, setShowHmacSecret] = useState(false)
  const [isFetchingToken, setIsFetchingToken] = useState(false)

  const currentType = auth?.type || 'none'

  const handleTypeChange = (type: AuthType) => {
    if (type === 'none') {
      onChange(undefined)
    } else if (type === 'hmac') {
      // Initialize HMAC with defaults
      onChange({
        type: 'hmac',
        hmac: {
          algorithm: 'sha256',
          secretKey: '',
          signatureComponents: ['method', 'path', 'timestamp'],
          signatureHeader: 'X-Signature',
          timestampHeader: 'X-Timestamp',
          nonceHeader: '',
          encoding: 'hex',
        }
      })
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
        <OAuth2Config
          auth={auth}
          onChange={onChange}
          showClientSecret={showClientSecret}
          setShowClientSecret={setShowClientSecret}
          showOAuthPassword={showOAuthPassword}
          setShowOAuthPassword={setShowOAuthPassword}
          isFetchingToken={isFetchingToken}
          setIsFetchingToken={setIsFetchingToken}
        />
      )}

      {currentType === 'hmac' && (
        <HmacConfig
          auth={auth}
          onChange={onChange}
          showHmacSecret={showHmacSecret}
          setShowHmacSecret={setShowHmacSecret}
        />
      )}
    </div>
  )
}

interface OAuth2ConfigProps {
  auth?: AuthConfig
  onChange: (auth: AuthConfig) => void
  showClientSecret: boolean
  setShowClientSecret: (show: boolean) => void
  showOAuthPassword: boolean
  setShowOAuthPassword: (show: boolean) => void
  isFetchingToken: boolean
  setIsFetchingToken: (fetching: boolean) => void
}

function OAuth2Config({
  auth,
  onChange,
  showClientSecret,
  setShowClientSecret,
  showOAuthPassword,
  setShowOAuthPassword,
  isFetchingToken,
  setIsFetchingToken,
}: OAuth2ConfigProps) {
  const oauth2 = auth?.oauth2 || {
    grantType: 'client_credentials' as const,
    accessTokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
  }

  const updateOAuth2 = (updates: Partial<typeof oauth2>) => {
    onChange({
      type: 'oauth2',
      oauth2: { ...oauth2, ...updates },
    })
  }

  const handleFetchToken = async () => {
    if (!oauth2.accessTokenUrl || !oauth2.clientId) {
      toast.error('Access Token URL and Client ID are required')
      return
    }

    setIsFetchingToken(true)

    try {
      const response = await api.post('/requests/oauth2/token/', {
        grant_type: oauth2.grantType,
        access_token_url: oauth2.accessTokenUrl,
        client_id: oauth2.clientId,
        client_secret: oauth2.clientSecret,
        scope: oauth2.scope,
        username: oauth2.username,
        password: oauth2.password,
      })

      if (response.data.access_token) {
        updateOAuth2({
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          tokenType: response.data.token_type || 'Bearer',
          expiresAt: response.data.expires_in
            ? Date.now() + response.data.expires_in * 1000
            : undefined,
        })
        toast.success('Token obtained successfully')
      } else {
        toast.error(response.data.error || 'Failed to get token')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch token'
      toast.error(errorMessage)
    } finally {
      setIsFetchingToken(false)
    }
  }

  const isTokenValid = oauth2.token && (!oauth2.expiresAt || oauth2.expiresAt > Date.now())

  return (
    <div className="space-y-6">
      {/* Grant Type Selector */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Grant Type</label>
        <div className="grid grid-cols-3 gap-2">
          {grantTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => updateOAuth2({ grantType: type.id })}
              className={clsx(
                'px-3 py-2 rounded-lg border text-left transition-colors',
                oauth2.grantType === type.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-border hover:border-primary-500/50 hover:bg-white/5'
              )}
            >
              <div className="font-medium text-xs">{type.label}</div>
              <div className="text-xs text-text-secondary mt-0.5 truncate">
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Authorization URL (only for authorization_code) */}
        {oauth2.grantType === 'authorization_code' && (
          <div className="col-span-2">
            <label className="block text-sm text-text-secondary mb-2">Authorization URL</label>
            <input
              type="text"
              value={oauth2.authorizationUrl || ''}
              onChange={(e) => updateOAuth2({ authorizationUrl: e.target.value })}
              placeholder="https://example.com/oauth/authorize"
              className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
            />
          </div>
        )}

        {/* Access Token URL */}
        <div className="col-span-2">
          <label className="block text-sm text-text-secondary mb-2">Access Token URL</label>
          <input
            type="text"
            value={oauth2.accessTokenUrl}
            onChange={(e) => updateOAuth2({ accessTokenUrl: e.target.value })}
            placeholder="https://example.com/oauth/token"
            className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
          />
        </div>

        {/* Client ID */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Client ID</label>
          <input
            type="text"
            value={oauth2.clientId}
            onChange={(e) => updateOAuth2({ clientId: e.target.value })}
            placeholder="your-client-id"
            className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
          />
        </div>

        {/* Client Secret */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Client Secret</label>
          <div className="relative">
            <input
              type={showClientSecret ? 'text' : 'password'}
              value={oauth2.clientSecret}
              onChange={(e) => updateOAuth2({ clientSecret: e.target.value })}
              placeholder="your-client-secret"
              className="w-full px-4 py-2 pr-10 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
            />
            <button
              type="button"
              onClick={() => setShowClientSecret(!showClientSecret)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
            >
              {showClientSecret ? (
                <EyeOff className="w-4 h-4 text-text-secondary" />
              ) : (
                <Eye className="w-4 h-4 text-text-secondary" />
              )}
            </button>
          </div>
        </div>

        {/* Username and Password (only for password grant) */}
        {oauth2.grantType === 'password' && (
          <>
            <div>
              <label className="block text-sm text-text-secondary mb-2">Username</label>
              <input
                type="text"
                value={oauth2.username || ''}
                onChange={(e) => updateOAuth2({ username: e.target.value })}
                placeholder="Enter username"
                className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">Password</label>
              <div className="relative">
                <input
                  type={showOAuthPassword ? 'text' : 'password'}
                  value={oauth2.password || ''}
                  onChange={(e) => updateOAuth2({ password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 pr-10 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOAuthPassword(!showOAuthPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                >
                  {showOAuthPassword ? (
                    <EyeOff className="w-4 h-4 text-text-secondary" />
                  ) : (
                    <Eye className="w-4 h-4 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Callback URL (only for authorization_code) */}
        {oauth2.grantType === 'authorization_code' && (
          <div className="col-span-2">
            <label className="block text-sm text-text-secondary mb-2">Callback URL</label>
            <input
              type="text"
              value={oauth2.redirectUri || ''}
              onChange={(e) => updateOAuth2({ redirectUri: e.target.value })}
              placeholder="https://localhost/callback"
              className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
            />
          </div>
        )}

        {/* Scope */}
        <div className="col-span-2">
          <label className="block text-sm text-text-secondary mb-2">Scope</label>
          <input
            type="text"
            value={oauth2.scope}
            onChange={(e) => updateOAuth2({ scope: e.target.value })}
            placeholder="read write (space-separated)"
            className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
          />
        </div>
      </div>

      {/* Token Section */}
      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-text-secondary">Current Token</label>
          <button
            onClick={handleFetchToken}
            disabled={isFetchingToken}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isFetchingToken
                ? 'bg-primary-600/50 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            )}
          >
            {isFetchingToken ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching...
              </>
            ) : oauth2.token ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh Token
              </>
            ) : (
              'Get New Access Token'
            )}
          </button>
        </div>

        {oauth2.token && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isTokenValid ? (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <Check className="w-3.5 h-3.5" />
                  <span>Token valid</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Token expired</span>
                </div>
              )}
              {oauth2.expiresAt && (
                <span className="text-xs text-text-secondary">
                  {isTokenValid
                    ? `Expires in ${Math.round((oauth2.expiresAt - Date.now()) / 60000)} min`
                    : `Expired ${Math.round((Date.now() - oauth2.expiresAt) / 60000)} min ago`}
                </span>
              )}
            </div>

            <div className="p-3 bg-sidebar rounded-lg border border-border">
              <div className="text-xs text-text-secondary mb-1">
                {oauth2.tokenType || 'Bearer'} Token
              </div>
              <div className="font-mono text-sm break-all text-text-primary">
                {oauth2.token.substring(0, 50)}...
              </div>
            </div>

            <button
              onClick={() => updateOAuth2({ token: undefined, refreshToken: undefined, expiresAt: undefined })}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Clear Token
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface HmacConfigProps {
  auth?: AuthConfig
  onChange: (auth: AuthConfig) => void
  showHmacSecret: boolean
  setShowHmacSecret: (show: boolean) => void
}

function HmacConfig({
  auth,
  onChange,
  showHmacSecret,
  setShowHmacSecret,
}: HmacConfigProps) {
  const hmac = auth?.hmac || {
    algorithm: 'sha256' as const,
    secretKey: '',
    signatureComponents: ['method', 'path', 'timestamp'] as ('method' | 'path' | 'timestamp' | 'body' | 'nonce')[],
    signatureHeader: 'X-Signature',
    timestampHeader: 'X-Timestamp',
    nonceHeader: '',
    encoding: 'hex' as const,
  }

  const updateHmac = (updates: Partial<typeof hmac>) => {
    onChange({
      type: 'hmac',
      hmac: { ...hmac, ...updates },
    })
  }

  const toggleComponent = (component: 'method' | 'path' | 'timestamp' | 'body' | 'nonce') => {
    const current = hmac.signatureComponents || []
    const updated = current.includes(component)
      ? current.filter(c => c !== component)
      : [...current, component]
    updateHmac({ signatureComponents: updated })
  }

  return (
    <div className="space-y-6">
      {/* Algorithm Selection */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Algorithm</label>
        <div className="grid grid-cols-4 gap-2">
          {hmacAlgorithms.map((algo) => (
            <button
              key={algo.id}
              onClick={() => updateHmac({ algorithm: algo.id })}
              className={clsx(
                'px-3 py-2 rounded-lg border text-center transition-colors text-sm',
                hmac.algorithm === algo.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-border hover:border-primary-500/50 hover:bg-white/5'
              )}
            >
              {algo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secret Key */}
      <div>
        <label className="block text-sm text-text-secondary mb-2">Secret Key</label>
        <div className="relative">
          <input
            type={showHmacSecret ? 'text' : 'password'}
            value={hmac.secretKey}
            onChange={(e) => updateHmac({ secretKey: e.target.value })}
            placeholder="Enter your secret key"
            className="w-full px-4 py-2 pr-10 bg-sidebar border border-border rounded-lg text-sm font-mono focus:border-primary-500"
          />
          <button
            type="button"
            onClick={() => setShowHmacSecret(!showHmacSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
          >
            {showHmacSecret ? (
              <EyeOff className="w-4 h-4 text-text-secondary" />
            ) : (
              <Eye className="w-4 h-4 text-text-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Signature Components */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Signature Components</label>
        <p className="text-xs text-text-secondary">Select what to include in the signature</p>
        <div className="flex flex-wrap gap-2">
          {hmacComponents.map((comp) => (
            <button
              key={comp.id}
              onClick={() => toggleComponent(comp.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                hmac.signatureComponents?.includes(comp.id)
                  ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                  : 'border-border hover:border-primary-500/50 hover:bg-white/5'
              )}
            >
              {comp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Encoding */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Signature Encoding</label>
        <div className="grid grid-cols-2 gap-2 w-48">
          <button
            onClick={() => updateHmac({ encoding: 'hex' })}
            className={clsx(
              'px-3 py-2 rounded-lg border text-center transition-colors text-sm',
              hmac.encoding === 'hex'
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-border hover:border-primary-500/50 hover:bg-white/5'
            )}
          >
            Hexadecimal
          </button>
          <button
            onClick={() => updateHmac({ encoding: 'base64' })}
            className={clsx(
              'px-3 py-2 rounded-lg border text-center transition-colors text-sm',
              hmac.encoding === 'base64'
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-border hover:border-primary-500/50 hover:bg-white/5'
            )}
          >
            Base64
          </button>
        </div>
      </div>

      {/* Header Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">Signature Header</label>
          <input
            type="text"
            value={hmac.signatureHeader}
            onChange={(e) => updateHmac({ signatureHeader: e.target.value })}
            placeholder="X-Signature"
            className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
          />
        </div>

        {hmac.signatureComponents?.includes('timestamp') && (
          <div>
            <label className="block text-sm text-text-secondary mb-2">Timestamp Header</label>
            <input
              type="text"
              value={hmac.timestampHeader || ''}
              onChange={(e) => updateHmac({ timestampHeader: e.target.value })}
              placeholder="X-Timestamp"
              className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
            />
          </div>
        )}

        {hmac.signatureComponents?.includes('nonce') && (
          <div>
            <label className="block text-sm text-text-secondary mb-2">Nonce Header</label>
            <input
              type="text"
              value={hmac.nonceHeader || ''}
              onChange={(e) => updateHmac({ nonceHeader: e.target.value })}
              placeholder="X-Nonce"
              className="w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 bg-sidebar rounded-lg border border-border">
        <div className="text-xs text-text-secondary mb-2">Signature will be computed from:</div>
        <div className="font-mono text-sm text-text-primary">
          {hmac.signatureComponents?.length > 0
            ? hmac.signatureComponents.join(' + ')
            : 'No components selected'}
        </div>
        <div className="text-xs text-text-secondary mt-2">
          Using {hmac.algorithm.toUpperCase()} → {hmac.encoding} → {hmac.signatureHeader || 'header'}
        </div>
      </div>
    </div>
  )
}
