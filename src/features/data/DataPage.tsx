import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function DataPage() {
  const navigate = useNavigate()
  const [json, setJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<unknown>(null)

  const handleValidate = () => {
    try {
      const data = JSON.parse(json)
      setParsed(data)
      setError(null)
    } catch (e) {
      setParsed(null)
      setError((e as Error).message)
    }
  }

  const handleUseData = () => {
    if (!parsed) return
    localStorage.setItem('chartai-json-data', json)
    navigate('/chat')
  }

  const handleClear = () => {
    setJson('')
    setParsed(null)
    setError(null)
  }

  const recordCount: number | null = parsed
    ? Array.isArray(parsed)
      ? parsed.length
      : typeof parsed === 'object' && parsed !== null
        ? Object.keys(parsed).length
        : null
    : null

  const previewKeys: string[] | null =
    parsed && Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object'
      ? Object.keys(parsed[0] as Record<string, unknown>)
      : parsed && !Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null
        ? Object.keys(parsed)
        : null

  return (
    <div className="flex h-screen bg-zinc-700">
      {/* Back button */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-zinc-600/50 px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chat')}
            className="h-8 w-8 text-zinc-300 hover:bg-zinc-600 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <h1 className="text-lg font-semibold text-white">Paste JSON Data</h1>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 overflow-hidden p-6">
          {/* Textarea */}
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <label className="text-sm text-zinc-300">
              Paste your JSON data below
            </label>
            <textarea
              value={json}
              onChange={(e) => {
                setJson(e.target.value)
                setError(null)
                setParsed(null)
              }}
              placeholder='[{"name": "Jan", "sales": 400}, {"name": "Feb", "sales": 300}, ...]'
              spellCheck={false}
              className="flex-1 resize-none rounded-xl border border-zinc-500/40 bg-zinc-600 p-4 font-mono text-sm text-white placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-800/40 px-4 py-3 text-sm text-red-200">
              <span className="font-medium">Invalid JSON:</span> {error}
            </div>
          )}

          {/* Success / preview */}
          {parsed && (
            <div className="rounded-lg bg-emerald-800/30 px-4 py-3 text-sm text-emerald-200">
              <span className="font-medium">Valid JSON</span>
              {recordCount !== null && (
                <span>
                  {' '}&mdash; {Array.isArray(parsed) ? `${recordCount} records` : `${recordCount} keys`}
                </span>
              )}
              {previewKeys && (
                <span className="block mt-1 text-emerald-300/70">
                  Fields: {previewKeys.join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleValidate}
              disabled={!json.trim()}
              className="bg-white text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
            >
              Validate
            </Button>
            <Button
              onClick={handleUseData}
              disabled={!parsed}
              className="bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Use in Chat
            </Button>
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={!json}
              className="text-zinc-300 hover:bg-zinc-600 hover:text-white disabled:opacity-50"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
