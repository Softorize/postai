import { useState, useMemo } from 'react'
import { Code2, Copy, Check, ChevronDown, Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import { generateCodeSnippet, LANGUAGE_OPTIONS, RequestConfig } from '@/utils/codeSnippets'

interface CodeSnippetPanelProps {
  config: RequestConfig
  isOpen: boolean
  onClose: () => void
}

// Simple syntax highlighting for multiple languages
function highlightCode(code: string, language: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0
  let keyIdx = 0

  // Language-specific keywords
  const keywordsByLang: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'new', 'typeof', 'instanceof', 'async', 'await', 'import', 'export', 'from', 'require'],
    python: ['import', 'from', 'def', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'raise', 'class', 'with', 'as', 'lambda', 'yield', 'assert', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False'],
    php: ['<?php', 'echo', 'require', 'require_once', 'include', 'function', 'return', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'try', 'catch', 'throw', 'new', 'class', 'public', 'private', 'protected', 'static', 'array', 'null', 'true', 'false'],
    go: ['package', 'import', 'func', 'return', 'if', 'else', 'for', 'range', 'defer', 'go', 'select', 'case', 'default', 'switch', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'nil', 'true', 'false'],
    ruby: ['require', 'def', 'end', 'return', 'if', 'else', 'elsif', 'unless', 'for', 'while', 'do', 'begin', 'rescue', 'raise', 'class', 'module', 'attr', 'puts', 'nil', 'true', 'false', 'self'],
    java: ['import', 'public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'throws', 'new', 'void', 'int', 'String', 'boolean', 'null', 'true', 'false'],
    csharp: ['using', 'namespace', 'public', 'private', 'protected', 'static', 'class', 'interface', 'return', 'if', 'else', 'for', 'foreach', 'while', 'try', 'catch', 'throw', 'new', 'void', 'var', 'await', 'async', 'null', 'true', 'false'],
    swift: ['import', 'func', 'return', 'if', 'else', 'for', 'while', 'do', 'try', 'catch', 'throw', 'guard', 'let', 'var', 'class', 'struct', 'enum', 'nil', 'true', 'false', 'self', 'in'],
    kotlin: ['import', 'fun', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'val', 'var', 'class', 'object', 'interface', 'null', 'true', 'false'],
    dart: ['import', 'void', 'main', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'var', 'final', 'const', 'class', 'null', 'true', 'false'],
    powershell: ['$', 'Invoke-RestMethod', 'Invoke-WebRequest', 'ConvertTo-Json', 'param', 'function', 'return', 'if', 'else', 'foreach', 'while', 'try', 'catch', 'throw'],
    r: ['library', 'function', 'return', 'if', 'else', 'for', 'while', 'TRUE', 'FALSE', 'NULL', 'NA'],
    rust: ['use', 'fn', 'let', 'mut', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'async', 'await', 'pub', 'struct', 'impl', 'trait', 'mod', 'Ok', 'Err', 'Some', 'None', 'true', 'false'],
    bash: ['curl', 'wget', 'http', 'echo', 'if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac'],
    http: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'HTTP/1.1', 'Host', 'Content-Type', 'Authorization', 'Accept'],
  }

  const builtinsByLang: Record<string, string[]> = {
    javascript: ['console', 'fetch', 'axios', 'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Promise', 'Request', 'Response', 'URL', 'URLSearchParams', 'FormData', 'XMLHttpRequest', 'Buffer'],
    python: ['requests', 'json', 'http', 'client', 'conn', 'print', 'str', 'int', 'float', 'list', 'dict', 'set'],
    php: ['curl_init', 'curl_setopt', 'curl_exec', 'curl_close', 'curl_setopt_array', 'GuzzleHttp', 'Client'],
    go: ['fmt', 'http', 'io', 'net', 'strings', 'Println', 'Printf', 'ReadAll', 'NewRequest', 'Client'],
    ruby: ['Net', 'HTTP', 'URI', 'response'],
    java: ['OkHttpClient', 'Request', 'Response', 'RequestBody', 'MediaType', 'HttpResponse', 'HttpURLConnection', 'Unirest', 'System', 'BufferedReader', 'InputStreamReader', 'OutputStream'],
    csharp: ['HttpClient', 'HttpRequestMessage', 'HttpMethod', 'StringContent', 'Console', 'RestClient', 'RestRequest', 'RestResponse'],
    swift: ['URLRequest', 'URLSession', 'URL', 'DispatchSemaphore', 'Foundation'],
    kotlin: ['OkHttpClient', 'Request', 'Response', 'println', 'toMediaType', 'toRequestBody'],
    dart: ['http', 'Dio', 'Uri', 'print', 'Future'],
    powershell: ['@', 'Headers', 'Body', 'response'],
    r: ['httr', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'add_headers', 'content_type', 'content', 'response'],
    rust: ['reqwest', 'tokio', 'Client', 'println', 'Box', 'dyn', 'Result', 'std', 'error', 'Error'],
    bash: [],
    http: [],
  }

  const keywords = keywordsByLang[language] || keywordsByLang.javascript
  const builtins = builtinsByLang[language] || builtinsByLang.javascript

  while (i < code.length) {
    const char = code[i]

    // String (single or double quotes or backticks)
    if (char === '"' || char === "'" || char === '`') {
      const quote = char
      let str = char
      i++
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1]
          i += 2
        } else {
          str += code[i]
          i++
        }
      }
      if (i < code.length) {
        str += code[i]
        i++
      }
      tokens.push(<span key={keyIdx++} className="text-green-400">{str}</span>)
      continue
    }

    // Triple-quoted strings (Python)
    if (code.slice(i, i + 3) === '"""' || code.slice(i, i + 3) === "'''") {
      const quote = code.slice(i, i + 3)
      let str = quote
      i += 3
      while (i < code.length && code.slice(i, i + 3) !== quote) {
        str += code[i]
        i++
      }
      if (i < code.length) {
        str += quote
        i += 3
      }
      tokens.push(<span key={keyIdx++} className="text-green-400">{str}</span>)
      continue
    }

    // Comments (// and #)
    if ((char === '/' && code[i + 1] === '/') || (char === '#' && language !== 'ruby')) {
      let comment = ''
      while (i < code.length && code[i] !== '\n') {
        comment += code[i]
        i++
      }
      tokens.push(<span key={keyIdx++} className="text-gray-500">{comment}</span>)
      continue
    }

    // Block comments /* */
    if (char === '/' && code[i + 1] === '*') {
      let comment = ''
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        comment += code[i]
        i++
      }
      if (i < code.length) {
        comment += '*/'
        i += 2
      }
      tokens.push(<span key={keyIdx++} className="text-gray-500">{comment}</span>)
      continue
    }

    // Numbers
    if (/\d/.test(char)) {
      let num = ''
      while (i < code.length && /[\d.]/.test(code[i])) {
        num += code[i]
        i++
      }
      tokens.push(<span key={keyIdx++} className="text-orange-400">{num}</span>)
      continue
    }

    // Identifiers (words)
    if (/[a-zA-Z_$@]/.test(char)) {
      let word = ''
      while (i < code.length && /[a-zA-Z0-9_$\-]/.test(code[i])) {
        word += code[i]
        i++
      }
      if (keywords.includes(word)) {
        tokens.push(<span key={keyIdx++} className="text-purple-400">{word}</span>)
      } else if (builtins.includes(word)) {
        tokens.push(<span key={keyIdx++} className="text-cyan-400">{word}</span>)
      } else if (word === 'true' || word === 'false' || word === 'null' || word === 'nil' || word === 'undefined' || word === 'None') {
        tokens.push(<span key={keyIdx++} className="text-orange-400">{word}</span>)
      } else {
        tokens.push(<span key={keyIdx++} className="text-text-primary">{word}</span>)
      }
      continue
    }

    // Operators and punctuation
    if (/[{}()\[\];,.:=<>!+\-*/%&|^~?\\@]/.test(char)) {
      tokens.push(<span key={keyIdx++} className="text-text-secondary">{char}</span>)
      i++
      continue
    }

    // Whitespace and other
    tokens.push(<span key={keyIdx++}>{char}</span>)
    i++
  }

  return tokens
}

// Group languages by category
const LANGUAGE_GROUPS = [
  { name: 'Shell', languages: LANGUAGE_OPTIONS.filter(l => ['curl', 'wget', 'httpie', 'http'].includes(l.id)) },
  { name: 'JavaScript', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('javascript-')) },
  { name: 'Node.js', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('nodejs-')) },
  { name: 'Python', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('python-')) },
  { name: 'PHP', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('php-')) },
  { name: 'Go', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('go-')) },
  { name: 'Ruby', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('ruby-')) },
  { name: 'Java', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('java-')) },
  { name: 'C#', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('csharp-')) },
  { name: 'Swift', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('swift-')) },
  { name: 'Kotlin', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('kotlin-')) },
  { name: 'Dart', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('dart-')) },
  { name: 'PowerShell', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('powershell-')) },
  { name: 'R', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('r-')) },
  { name: 'Rust', languages: LANGUAGE_OPTIONS.filter(l => l.id.startsWith('rust-')) },
]

export function CodeSnippetPanel({ config, isOpen, onClose }: CodeSnippetPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('curl')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const selectedLangOption = LANGUAGE_OPTIONS.find(l => l.id === selectedLanguage) || LANGUAGE_OPTIONS[0]

  const code = useMemo(() => {
    return generateCodeSnippet(selectedLanguage, config)
  }, [selectedLanguage, config])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Filter languages based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return LANGUAGE_GROUPS

    const query = searchQuery.toLowerCase()
    return LANGUAGE_GROUPS.map(group => ({
      ...group,
      languages: group.languages.filter(l =>
        l.name.toLowerCase().includes(query) ||
        (l.variant && l.variant.toLowerCase().includes(query)) ||
        l.id.toLowerCase().includes(query)
      )
    })).filter(group => group.languages.length > 0)
  }, [searchQuery])

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col bg-panel border-l border-border" style={{ width: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary-400" />
          <span className="font-medium text-sm">Code snippet</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Language selector */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-sidebar border border-border rounded-lg hover:border-primary-500/50 transition-colors"
          >
            <span className="text-sm">
              {selectedLangOption.name}
              {selectedLangOption.variant && (
                <span className="text-text-secondary"> - {selectedLangOption.variant}</span>
              )}
            </span>
            <ChevronDown className={clsx('w-4 h-4 text-text-secondary transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-sidebar border border-border rounded-lg shadow-xl z-50 max-h-[400px] overflow-hidden flex flex-col">
                {/* Search */}
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search languages..."
                      className="w-full pl-9 pr-3 py-2 bg-panel border border-border rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Language list */}
                <div className="overflow-y-auto flex-1">
                  {filteredGroups.map(group => (
                    <div key={group.name}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary bg-panel sticky top-0">
                        {group.name}
                      </div>
                      {group.languages.map(lang => (
                        <button
                          key={lang.id}
                          onClick={() => {
                            setSelectedLanguage(lang.id)
                            setDropdownOpen(false)
                            setSearchQuery('')
                          }}
                          className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors',
                            selectedLanguage === lang.id && 'bg-primary-500/10 text-primary-400'
                          )}
                        >
                          <Check className={clsx('w-4 h-4', selectedLanguage === lang.id ? 'opacity-100' : 'opacity-0')} />
                          <span>{lang.name}</span>
                          {lang.variant && (
                            <span className="text-text-secondary">- {lang.variant}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Code display */}
      <div className="flex-1 overflow-auto relative">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={clsx(
            'absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all z-10',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/10 hover:bg-white/20 text-text-secondary hover:text-text-primary'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>

        {/* Code with syntax highlighting */}
        <pre className="p-4 pr-24 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
          {highlightCode(code, selectedLangOption.language)}
        </pre>
      </div>
    </div>
  )
}
