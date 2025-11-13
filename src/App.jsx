import { useEffect, useMemo, useState } from 'react'

function guessBackendFromLocation() {
  try {
    const u = new URL(window.location.href)
    // Heuristic: Modal preview uses a host with -3000 for frontend and -8000 for backend
    if (u.host.includes('-3000.')) {
      return `${u.protocol}//${u.host.replace('-3000.', '-8000.')}`
    }
  } catch {
    // ignore
  }
  return ''
}

function App() {
  const envBackend = import.meta.env.VITE_BACKEND_URL || ''
  const guessed = useMemo(() => guessBackendFromLocation(), [])
  const initialBackend = envBackend || guessed

  const [backendUrl, setBackendUrl] = useState(initialBackend)
  const [file, setFile] = useState(null)
  const [lang, setLang] = useState('English')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Try health check automatically to surface CORS/URL issues early
    async function ping() {
      if (!backendUrl) return
      try {
        const r = await fetch(`${backendUrl}/health`)
        if (!r.ok) throw new Error('Health check failed')
      } catch (e) {
        // Show a gentle warning but don't block
        setError('Backend not reachable. Please verify the Backend URL below.')
      }
    }
    ping()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl])

  const handleUpload = async () => {
    if (!backendUrl) {
      setError('Please set a valid Backend URL')
      return
    }
    if (!file) {
      setError('Please choose an audio file')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('language', lang)

      const res = await fetch(`${backendUrl}/predict`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t)
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e?.message?.toString() || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Multilingual Speech Emotion Recognition</h1>
        <p className="text-gray-600 mb-8">Upload an audio clip and choose a language to detect the emotion.</p>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backend URL</label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://<your-backend-url>"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">If empty, set this to the API URL. Example: replace -3000 with -8000 in the domain.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audio file</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option>English</option>
                <option>Kannada</option>
                <option>Marathi</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Analyze Emotion'}
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>

          {result && (
            <div className="border-t pt-6">
              <div className="mb-3 text-gray-700">Detected emotion: <span className="font-semibold text-gray-900">{result.emotion}</span></div>
              <div className="space-y-2">
                {result.probabilities && Object.entries(result.probabilities).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span className="capitalize">{k}</span>
                      <span>{(v * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded">
                      <div style={{ width: `${Math.max(2, v * 100)}%` }} className={`h-2 rounded ${k === result.emotion ? 'bg-indigo-600' : 'bg-indigo-300'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500">TF available: {String(result.tf_available)}</div>
            </div>
          )}
        </div>

        <div className="mt-8 text-sm text-gray-500">
          Tip: If you see "Failed to fetch", ensure the Backend URL is set to the live API (replace -3000 with -8000 in the domain) and that it uses https.
        </div>
      </div>
    </div>
  )
}

export default App
