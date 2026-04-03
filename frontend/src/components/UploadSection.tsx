import { useState, useRef, ChangeEvent } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const MAX_ITEMS = 100

interface Props {
  onResults: (results: unknown[]) => void
  isLoading: boolean
  setIsLoading: (v: boolean) => void
}

/**
 * Handles both CSV file upload and copy/paste text input.
 * Calls the appropriate backend endpoint and passes results up.
 */
export function UploadSection({ onResults, isLoading, setIsLoading }: Props) {
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePasteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setPasteText(val)
    setError(null)

    // Live preview: count detected items
    const lines = val.split('\n').filter(l => l.trim())
    if (lines.length > 1) {
      setPreviewCount(Math.min(lines.length, MAX_ITEMS))
    } else if (val.includes(',')) {
      setPreviewCount(Math.min(val.split(',').filter(p => p.trim()).length, MAX_ITEMS))
    } else {
      setPreviewCount(val.trim() ? 1 : 0)
    }
  }

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/classify/paste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [pasteText] }),
      })
      if (!res.ok) {
        const detail = await res.json().then(d => d.detail).catch(() => res.statusText)
        throw new Error(detail)
      }
      const data = await res.json()
      onResults(data.results)
      setPasteText('')
      setPreviewCount(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Classification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCSVUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_URL}/api/classify/csv`, { method: 'POST', body: form })
      if (!res.ok) {
        const detail = await res.json().then(d => d.detail).catch(() => res.statusText)
        throw new Error(detail)
      }
      const data = await res.json()
      onResults(data.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV upload failed')
    } finally {
      setIsLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* CSV Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
        <p className="text-sm text-gray-500 mb-3">Upload a CSV file with a <code>text</code>, <code>feedback</code>, <code>content</code>, or <code>message</code> column</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          disabled={isLoading}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Choose CSV File'}
        </label>
      </div>

      {/* Paste Input */}
      <div className="space-y-2">
        <textarea
          value={pasteText}
          onChange={handlePasteChange}
          disabled={isLoading}
          placeholder="Paste feedback here — one per line, comma-separated, or single entry..."
          rows={6}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {previewCount > 0 && (
          <p className="text-xs text-gray-500">{previewCount} item{previewCount !== 1 ? 's' : ''} detected{previewCount === MAX_ITEMS ? ' (max)' : ''}</p>
        )}
        <button
          onClick={handlePasteSubmit}
          disabled={isLoading || !pasteText.trim()}
          className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {isLoading ? 'Classifying...' : 'Classify Text'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}
    </div>
  )
}
