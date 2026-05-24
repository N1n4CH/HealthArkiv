import { useState } from 'react'
import { fetchSymptomLogs, fetchBiomarkers } from '../lib/arkiv'
import { decryptPayload } from '../lib/crypto'
import { generateHealthInsights, type HealthInsight } from '../lib/claude'
import { useWallet } from '../hooks/useWallet'
import type { SymptomPayload, BiomarkerPayload } from '../lib/types'

export function AIInsights() {
  const { address, encryptionKey } = useWallet()
  const [insight, setInsight] = useState<HealthInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    if (!address || !encryptionKey) return
    setLoading(true)
    setError(null)
    setInsight(null)

    try {
      const [rawSymptoms, rawBiomarkers] = await Promise.all([
        fetchSymptomLogs(address),
        fetchBiomarkers(address),
      ])

      // Decrypt all data before sending to Claude
      const symptoms = await Promise.all(
        rawSymptoms.map(async (s) => {
          try {
            const dec = await decryptPayload<SymptomPayload>(encryptionKey, s.encryptedPayload)
            return { ...s, decrypted: dec }
          } catch { return s }
        }),
      )

      const biomarkers = await Promise.all(
        rawBiomarkers.map(async (b) => {
          try {
            const dec = await decryptPayload<BiomarkerPayload>(encryptionKey, b.encryptedPayload)
            return { ...b, decrypted: dec }
          } catch { return b }
        }),
      )

      if (symptoms.length === 0 && biomarkers.length === 0) {
        setError('No health data found. Log some symptoms or biomarkers first.')
        return
      }

      const result = await generateHealthInsights(symptoms, biomarkers)
      setInsight(result)
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">AI Health Insights</div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Your health data is decrypted locally in your browser, then analysed by Claude to identify
          patterns and generate personalised recommendations.
          Nothing is stored — this is a read-only analysis.
        </p>

        {!import.meta.env.VITE_ANTHROPIC_API_KEY && (
          <div className="error-msg" style={{ marginBottom: 16 }}>
            VITE_ANTHROPIC_API_KEY not set in .env — AI insights require a Claude API key.
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={loading || !import.meta.env.VITE_ANTHROPIC_API_KEY}
        >
          {loading ? (
            <><span className="spinner" /> Analysing your data…</>
          ) : (
            '✦ Generate Insights'
          )}
        </button>
      </div>

      {insight && (
        <div className="insight-card">
          <div className="insight-summary">{insight.summary}</div>

          {insight.patterns.length > 0 && (
            <>
              <div className="insight-section-title">Patterns Detected</div>
              <ul className="insight-list">
                {insight.patterns.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </>
          )}

          {insight.recommendations.length > 0 && (
            <>
              <div className="insight-section-title">Recommendations</div>
              <ul className="insight-list">
                {insight.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}

          {insight.longCovidRelevance && (
            <div className="long-covid-banner">
              <strong>⚠ Long COVID / Post-viral note:</strong> {insight.longCovidRelevance}
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.5 }}>
            This is not medical advice. Consult a qualified clinician before making health decisions.
          </p>
        </div>
      )}
    </div>
  )
}
