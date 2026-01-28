import { useState } from 'react'
import { useLicenseStore } from '@/stores/license.store'
import { KeyRound, Loader2, AlertCircle } from 'lucide-react'

export function LicenseGate() {
  const { activate, error } = useLicenseStore()
  const [key, setKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatKey = (value: string) => {
    const raw = value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 20)
    const groups = raw.match(/.{1,5}/g) || []
    return groups.length ? `POSTAI-${groups.join('-')}` : value.startsWith('P') ? value : ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === '' || v === 'P' || v === 'PO' || v === 'POS' || v === 'POST' || v === 'POSTA' || v === 'POSTAI' || v === 'POSTAI-') {
      setKey(v)
      return
    }
    if (v.startsWith('POSTAI-')) {
      setKey(formatKey(v.slice(7)))
    } else {
      setKey(v)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await activate(key)
    setIsSubmitting(false)
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-panel text-text-primary">
      <div className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600/20 flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Trial Expired</h1>
          <p className="text-text-secondary text-center">
            Your 30-day trial has ended. Enter a license key to continue using PostAI.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="license-key" className="block text-sm font-medium text-text-secondary mb-1">
              License Key
            </label>
            <input
              id="license-key"
              type="text"
              value={key}
              onChange={handleChange}
              placeholder="POSTAI-XXXXX-XXXXX-XXXXX-XXXXX"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-text-primary font-mono text-sm placeholder:text-text-tertiary focus:outline-none focus:border-primary-500"
              spellCheck={false}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || key.length < 29}
            className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Activating...
              </>
            ) : (
              'Activate License'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
