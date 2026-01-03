// Base types
export interface BaseModel {
  id: string
  created_at: string
  updated_at: string
}

// Workspace types
export interface Workspace extends BaseModel {
  name: string
  description: string
  is_active: boolean
  collections_count?: number
  environments_count?: number
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

// Collection types
export interface Collection extends BaseModel {
  workspace?: string
  name: string
  description: string
  postman_id?: string
  schema_version: string
  variables: CollectionVariable[]
  auth?: AuthConfig
  pre_request_script: string
  test_script: string
  folders: Folder[]
  requests: Request[]
  sync_id?: string
  last_synced_at?: string
}

export interface CollectionVariable {
  key: string
  value: string
  type: string
  description: string
}

export interface Folder extends BaseModel {
  collection: string
  parent?: string
  name: string
  description: string
  auth?: AuthConfig
  pre_request_script: string
  test_script: string
  order: number
  subfolders: Folder[]
  requests: Request[]
}

// Request types
export interface Request extends BaseModel {
  collection: string
  folder?: string
  name: string
  description: string
  method: HttpMethod
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body?: RequestBody
  auth?: AuthConfig
  pre_request_script: string
  test_script: string
  order: number
}

export interface KeyValuePair {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface RequestBody {
  mode: 'raw' | 'formdata' | 'urlencoded' | 'graphql' | 'binary'
  raw?: string
  language?: 'json' | 'xml' | 'text' | 'javascript' | 'html'
  formdata?: FormDataItem[]
  urlencoded?: KeyValuePair[]
  graphql?: {
    query: string
    variables: string
  }
}

export interface FormDataItem extends KeyValuePair {
  type: 'text' | 'file'
  src?: string
}

// Auth types
export type AuthType = 'none' | 'basic' | 'bearer' | 'oauth2' | 'apikey' | 'hmac'

export interface AuthConfig {
  type: AuthType
  basic?: {
    username: string
    password: string
  }
  bearer?: {
    token: string
  }
  apikey?: {
    key: string
    value: string
    in: 'header' | 'query'
  }
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials' | 'password'
    authorizationUrl?: string  // For authorization_code flow
    accessTokenUrl: string
    clientId: string
    clientSecret: string
    scope: string
    redirectUri?: string  // For authorization_code flow
    state?: string  // For authorization_code flow
    // For password grant type
    username?: string
    password?: string
    // Token storage
    token?: string
    refreshToken?: string
    tokenType?: string
    expiresAt?: number
  }
  hmac?: {
    algorithm: 'sha256' | 'sha512' | 'sha1' | 'md5'
    secretKey: string
    // What to include in the signature
    signatureComponents: ('method' | 'path' | 'timestamp' | 'body' | 'nonce')[]
    // Where to put the signature
    signatureHeader: string
    // Optional timestamp header
    timestampHeader?: string
    // Optional nonce header
    nonceHeader?: string
    // Encoding for the signature
    encoding: 'hex' | 'base64'
  }
}

// Environment types
export interface Environment extends BaseModel {
  name: string
  description: string
  is_active: boolean
  variables: EnvironmentVariable[]
  sync_id?: string
  last_synced_at?: string
}

export interface EnvironmentVariable extends BaseModel {
  environment: string
  key: string
  values: string[]  // Multi-value support
  selected_value_index: number
  description: string
  is_secret: boolean
  enabled: boolean
  link_group?: string | null  // Variables with same link_group sync their selected_value_index
}

// Request History
export interface RequestHistory extends BaseModel {
  request?: string
  method: HttpMethod
  url: string
  resolved_url: string
  headers: Record<string, string>
  body?: string
  status_code?: number
  status_text: string
  response_headers: Record<string, string>
  response_body?: string
  response_size: number
  response_time: number
  environment_snapshot: Record<string, string>
  proxy_used?: string
  error_message?: string
}

// Response types
export interface Response {
  status_code: number
  status_text: string
  headers: Record<string, string>
  body: string
  size: number
  time: number
  cookies?: Cookie[]
}

export interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: string
  httpOnly: boolean
  secure: boolean
}

// Workflow types
export interface Workflow extends BaseModel {
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
  variables: Record<string, unknown>
  sync_id?: string
  last_synced_at?: string
}

export interface WorkflowNode {
  id: string
  type: 'start' | 'end' | 'request' | 'condition' | 'loop' | 'delay' | 'variable' | 'script'
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data?: {
    condition?: number | 'default'
    type?: 'loop_body'
  }
}

export interface WorkflowExecution extends BaseModel {
  workflow: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at?: string
  completed_at?: string
  input_variables: Record<string, unknown>
  output_variables: Record<string, unknown>
  execution_log: WorkflowExecutionLog[]
  error_message?: string
}

export interface WorkflowExecutionLog {
  node_id: string
  node_type: string
  success: boolean
  output?: unknown
  error?: string
  execution_time_ms: number
  timestamp: string
}

// MCP types
export type McpTransportType = 'stdio' | 'sse' | 'http'

export interface McpServer extends BaseModel {
  name: string
  description: string
  transport_type: McpTransportType
  command?: string
  args: string[]
  url?: string
  headers: Record<string, string>
  env_vars: Record<string, string>
  is_connected: boolean
  last_connected_at?: string
}

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface McpResource {
  uri: string
  name: string
  description: string
  mimeType?: string
}

export interface McpPrompt {
  name: string
  description: string
  arguments?: Array<{
    name: string
    description: string
    required: boolean
  }>
}

// AI types
export type AiProviderType = 'anthropic' | 'deepseek' | 'openai' | 'copilot' | 'custom'

export interface AiProvider extends BaseModel {
  name: string
  provider_type: AiProviderType
  api_key: string
  api_base_url?: string
  default_model: string
  is_active: boolean
  max_requests_per_minute: number
}

export interface AiConversation extends BaseModel {
  title: string
  provider?: string
  context: Record<string, unknown>
  messages: AiMessage[]
}

export interface AiMessage extends BaseModel {
  conversation: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used: number
}

// Proxy types
export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5'

export interface ProxyConfiguration extends BaseModel {
  name: string
  proxy_type: ProxyType
  host: string
  port: number
  username?: string
  password?: string
  is_default: boolean
  enabled: boolean
  bypass_list: string[]
}
