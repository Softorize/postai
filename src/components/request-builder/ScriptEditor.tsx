import { useRef } from 'react'
import { Info } from 'lucide-react'

interface ScriptEditorProps {
  value: string
  onChange: (value: string) => void
  type: 'pre-request' | 'tests'
  onTest?: () => void
}

// PM API documentation snippets
const PM_SNIPPETS = {
  'pre-request': [
    { label: 'Add Auth header from env', code: 'const token = pm.environment.get("access_token");\nif (token) {\n  pm.request.headers.add("Authorization", "Bearer " + token);\n}' },
    { label: 'Set environment variable', code: 'pm.environment.set("key", "value");' },
    { label: 'Get environment variable', code: 'const value = pm.environment.get("key");' },
    { label: 'Set collection variable', code: 'pm.variables.set("key", "value");' },
    { label: 'Get collection variable', code: 'const value = pm.variables.get("key");' },
    { label: 'Generate UUID', code: 'const uuid = pm.variables.uuid();' },
    { label: 'Generate timestamp', code: 'const timestamp = pm.variables.timestamp();' },
    { label: 'Generate random int', code: 'const num = pm.variables.randomInt(1, 100);' },
    { label: 'Set request header', code: 'pm.request.headers.add("key", "value");' },
    { label: 'Console log', code: 'console.log("message");' },
  ],
  'tests': [
    { label: 'Save access token to env', code: 'const json = pm.response.json();\nif (json.access_token) {\n  pm.environment.set("access_token", json.access_token);\n  console.log("Token saved to environment");\n}' },
    { label: 'Test status code', code: 'pm.test("Status is 200", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});' },
    { label: 'Test response time', code: 'pm.test("Response time < 500ms", () => {\n  pm.expect(pm.response.responseTime).to.be.below(500);\n});' },
    { label: 'Test JSON response', code: 'pm.test("Response has id", () => {\n  const json = pm.response.json();\n  pm.expect(json).to.have.property("id");\n});' },
    { label: 'Test header exists', code: 'pm.test("Has content-type", () => {\n  pm.expect(pm.response.headers).to.have.property("content-type");\n});' },
    { label: 'Set env from response', code: 'const json = pm.response.json();\npm.environment.set("key", json.value);' },
  ],
}

// Simple JavaScript syntax highlighting
function highlightJS(code: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0
  let keyIdx = 0

  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'new', 'typeof', 'instanceof']
  const builtins = ['pm', 'console', 'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean']

  while (i < code.length) {
    const char = code[i]

    // String (single or double quotes)
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

    // Comments
    if (char === '/' && code[i + 1] === '/') {
      let comment = ''
      while (i < code.length && code[i] !== '\n') {
        comment += code[i]
        i++
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
    if (/[a-zA-Z_$]/.test(char)) {
      let word = ''
      while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
        word += code[i]
        i++
      }
      if (keywords.includes(word)) {
        tokens.push(<span key={keyIdx++} className="text-purple-400">{word}</span>)
      } else if (builtins.includes(word)) {
        tokens.push(<span key={keyIdx++} className="text-cyan-400">{word}</span>)
      } else if (word === 'true' || word === 'false' || word === 'null' || word === 'undefined') {
        tokens.push(<span key={keyIdx++} className="text-orange-400">{word}</span>)
      } else {
        tokens.push(<span key={keyIdx++} className="text-text-primary">{word}</span>)
      }
      continue
    }

    // Operators and punctuation
    if (/[{}()\[\];,.:=<>!+\-*/%&|^~?]/.test(char)) {
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

export function ScriptEditor({ value, onChange, type }: ScriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertSnippet = (code: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = value || ''

    // Add newline if there's existing content and we're not at the start
    const prefix = currentValue.trim() && start > 0 ? '\n' : ''
    const newValue = currentValue.slice(0, start) + prefix + code + '\n' + currentValue.slice(end)

    onChange(newValue)

    // Set cursor position after inserted code
    setTimeout(() => {
      const newPos = start + prefix.length + code.length + 1
      textarea.setSelectionRange(newPos, newPos)
      textarea.focus()
    }, 0)
  }

  const snippets = PM_SNIPPETS[type]

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">
            {type === 'pre-request' ? 'Pre-request Script' : 'Tests'}
          </span>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <Info className="w-3.5 h-3.5" />
            <span>
              {type === 'pre-request'
                ? 'Use JavaScript to run before the request'
                : 'Use JavaScript to test response'
              }
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={type === 'pre-request'
              ? '// Pre-request script runs before the request\n// Use pm.environment.set() to set variables\n// Use pm.request.headers.add() to modify headers'
              : '// Test script runs after response\n// Use pm.test() to create tests\n// Use pm.expect() for assertions'
            }
            className="script-editor-textarea absolute inset-0 w-full h-full px-4 py-3 bg-sidebar font-mono text-sm resize-none focus:outline-none focus:ring-0 border-none"
            spellCheck={false}
            style={{
              tabSize: 2,
            }}
            onKeyDown={(e) => {
              // Handle Tab key for indentation
              if (e.key === 'Tab') {
                e.preventDefault()
                const textarea = e.currentTarget
                const start = textarea.selectionStart
                const end = textarea.selectionEnd
                const newValue = value.slice(0, start) + '  ' + value.slice(end)
                onChange(newValue)
                setTimeout(() => {
                  textarea.setSelectionRange(start + 2, start + 2)
                }, 0)
              }
            }}
          />
          {/* Syntax highlighted overlay */}
          <pre className="absolute inset-0 px-4 py-3 bg-transparent font-mono text-sm overflow-auto pointer-events-none whitespace-pre-wrap break-words">
            {value ? highlightJS(value) : (
              <span className="text-text-secondary/50">
                {type === 'pre-request'
                  ? '// Pre-request script runs before the request\n// Use pm.environment.set() to set variables\n// Use pm.request.headers.add() to modify headers'
                  : '// Test script runs after response\n// Use pm.test() to create tests\n// Use pm.expect() for assertions'
                }
              </span>
            )}
          </pre>
        </div>

        {/* Snippets sidebar */}
        <div className="w-48 border-l border-border bg-sidebar overflow-y-auto">
          <div className="p-2">
            <h4 className="text-xs font-semibold text-text-secondary mb-2 px-1">Snippets</h4>
            <div className="space-y-0.5">
              {snippets.map((snippet, idx) => (
                <button
                  key={idx}
                  onClick={() => insertSnippet(snippet.code)}
                  className="w-full text-left px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded transition-colors"
                >
                  {snippet.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
