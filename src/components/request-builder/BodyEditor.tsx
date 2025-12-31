import { useState } from 'react'
import { clsx } from 'clsx'
import { RequestBody } from '@/types'
import { KeyValueEditor } from './KeyValueEditor'

type BodyMode = 'none' | 'raw' | 'formdata' | 'urlencoded' | 'graphql' | 'binary'
type RawLanguage = 'json' | 'xml' | 'text' | 'javascript' | 'html'

// JSON syntax highlighter
function highlightJson(json: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0
  let keyIndex = 0

  const addToken = (text: string, className: string) => {
    tokens.push(
      <span key={keyIndex++} className={className}>
        {text}
      </span>
    )
  }

  while (i < json.length) {
    const char = json[i]

    // Whitespace
    if (/\s/.test(char)) {
      let whitespace = ''
      while (i < json.length && /\s/.test(json[i])) {
        whitespace += json[i]
        i++
      }
      tokens.push(<span key={keyIndex++}>{whitespace}</span>)
      continue
    }

    // String (key or value)
    if (char === '"') {
      let str = '"'
      i++
      while (i < json.length && json[i] !== '"') {
        if (json[i] === '\\' && i + 1 < json.length) {
          str += json[i] + json[i + 1]
          i += 2
        } else {
          str += json[i]
          i++
        }
      }
      str += '"'
      i++

      // Check if this is a key (followed by :)
      let j = i
      while (j < json.length && /\s/.test(json[j])) j++
      if (json[j] === ':') {
        addToken(str, 'text-cyan-400') // Key
      } else {
        addToken(str, 'text-green-400') // String value
      }
      continue
    }

    // Number
    if (/[-\d]/.test(char)) {
      let num = ''
      while (i < json.length && /[-\d.eE+]/.test(json[i])) {
        num += json[i]
        i++
      }
      addToken(num, 'text-orange-400')
      continue
    }

    // Boolean or null
    if (json.slice(i, i + 4) === 'true') {
      addToken('true', 'text-purple-400')
      i += 4
      continue
    }
    if (json.slice(i, i + 5) === 'false') {
      addToken('false', 'text-purple-400')
      i += 5
      continue
    }
    if (json.slice(i, i + 4) === 'null') {
      addToken('null', 'text-red-400')
      i += 4
      continue
    }

    // Punctuation
    if (char === ':') {
      addToken(': ', 'text-text-secondary')
      i++
      // Skip space after colon if present
      if (json[i] === ' ') i++
      continue
    }
    if (char === ',' || char === '{' || char === '}' || char === '[' || char === ']') {
      addToken(char, 'text-text-secondary')
      i++
      continue
    }

    // Any other character
    tokens.push(<span key={keyIndex++}>{char}</span>)
    i++
  }

  return tokens
}

interface BodyEditorProps {
  body: RequestBody
  onChange: (body: RequestBody) => void
}

export function BodyEditor({ body, onChange }: BodyEditorProps) {
  const [mode, setMode] = useState<BodyMode>((body.mode as BodyMode) || 'none')

  const handleModeChange = (newMode: BodyMode) => {
    setMode(newMode)
    onChange({ ...body, mode: newMode === 'none' ? 'raw' : newMode })
  }

  const modes: { id: BodyMode; label: string }[] = [
    { id: 'none', label: 'none' },
    { id: 'raw', label: 'raw' },
    { id: 'formdata', label: 'form-data' },
    { id: 'urlencoded', label: 'x-www-form-urlencoded' },
    { id: 'graphql', label: 'GraphQL' },
  ]

  const rawLanguages: { id: RawLanguage; label: string }[] = [
    { id: 'json', label: 'JSON' },
    { id: 'xml', label: 'XML' },
    { id: 'text', label: 'Text' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'html', label: 'HTML' },
  ]

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-sidebar rounded-lg p-1">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={clsx(
                'px-3 py-1 text-sm rounded transition-colors',
                mode === m.id
                  ? 'bg-primary-500 text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Language selector for raw mode */}
        {mode === 'raw' && (
          <select
            value={body.language || 'json'}
            onChange={(e) =>
              onChange({ ...body, language: e.target.value as RawLanguage })
            }
            className="px-3 py-1 bg-sidebar border border-border rounded text-sm"
          >
            {rawLanguages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Body content */}
      {mode === 'none' && (
        <div className="text-text-secondary text-sm">
          This request does not have a body
        </div>
      )}

      {mode === 'raw' && (
        <div className="relative">
          {/* Syntax highlighted overlay for JSON */}
          {body.language === 'json' && body.raw && (
            <pre className="absolute inset-0 px-4 py-3 bg-sidebar border border-transparent rounded-lg text-sm font-mono overflow-hidden pointer-events-none whitespace-pre-wrap break-all">
              {highlightJson(body.raw)}
            </pre>
          )}
          <textarea
            value={body.raw || ''}
            onChange={(e) => onChange({ ...body, raw: e.target.value })}
            placeholder={
              body.language === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Enter request body...'
            }
            className={clsx(
              'w-full h-64 px-4 py-3 bg-sidebar border border-border rounded-lg text-sm font-mono resize-none focus:border-primary-500',
              body.language === 'json' && body.raw ? 'text-transparent caret-white selection:bg-primary-500/40 selection:text-white' : ''
            )}
          />
          {body.language === 'json' && (
            <button
              onClick={() => {
                try {
                  const formatted = JSON.stringify(JSON.parse(body.raw || ''), null, 2)
                  onChange({ ...body, raw: formatted })
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded"
            >
              Format
            </button>
          )}
        </div>
      )}

      {mode === 'formdata' && (
        <KeyValueEditor
          items={body.formdata || [{ key: '', value: '', enabled: true }]}
          onChange={(items) =>
            onChange({
              ...body,
              formdata: items.map((i) => ({ ...i, type: 'text' as const })),
            })
          }
          keyPlaceholder="Key"
          valuePlaceholder="Value"
        />
      )}

      {mode === 'urlencoded' && (
        <KeyValueEditor
          items={body.urlencoded || [{ key: '', value: '', enabled: true }]}
          onChange={(items) => onChange({ ...body, urlencoded: items })}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
        />
      )}

      {mode === 'graphql' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Query</label>
            <textarea
              value={body.graphql?.query || ''}
              onChange={(e) =>
                onChange({
                  ...body,
                  graphql: { ...body.graphql, query: e.target.value, variables: body.graphql?.variables || '' },
                })
              }
              placeholder="query { ... }"
              className="w-full h-40 px-4 py-3 bg-sidebar border border-border rounded-lg text-sm font-mono resize-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">Variables</label>
            <textarea
              value={body.graphql?.variables || ''}
              onChange={(e) =>
                onChange({
                  ...body,
                  graphql: { ...body.graphql, query: body.graphql?.query || '', variables: e.target.value },
                })
              }
              placeholder='{ "var": "value" }'
              className="w-full h-24 px-4 py-3 bg-sidebar border border-border rounded-lg text-sm font-mono resize-none focus:border-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
