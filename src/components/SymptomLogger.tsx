import { useState } from 'react'
import { encryptPayload } from '../lib/crypto'
import { createSymptomLog } from '../lib/arkiv'
import { useWallet } from '../hooks/useWallet'
import type { SymptomCategory, SymptomPayload } from '../lib/types'

const CATEGORIES: SymptomCategory[] = [
  'fatigue', 'cognitive', 'pain', 'cardiac', 'sleep', 'gut', 'mood', 'respiratory', 'other',
]

const SYMPTOM_OPTIONS: Record<SymptomCategory, string[]> = {
  fatigue: ['Post-exertional malaise', 'Exhaustion', 'Muscle weakness', 'Heavy limbs'],
  cognitive: ['Brain fog', 'Memory issues', 'Concentration problems', 'Word-finding difficulty'],
  pain: ['Headache', 'Muscle pain', 'Joint pain', 'Chest pain', 'Abdominal pain'],
  cardiac: ['Palpitations', 'Racing heart', 'Shortness of breath', 'Chest tightness'],
  sleep: ['Insomnia', 'Hypersomnia', 'Unrefreshing sleep', 'Night sweats'],
  gut: ['Nausea', 'Bloating', 'Diarrhoea', 'Constipation', 'Appetite loss'],
  mood: ['Anxiety', 'Low mood', 'Irritability', 'Emotional dysregulation'],
  respiratory: ['Shortness of breath', 'Cough', 'Throat tightness', 'Post-nasal drip'],
  other: ['Fever', 'Chills', 'Rash', 'Hair loss', 'Tinnitus', 'Dizziness'],
}

interface Props {
  onLogged: () => void
}

export function SymptomLogger({ onLogged }: Props) {
  const { address, encryptionKey } = useWallet()
  const [category, setCategory] = useState<SymptomCategory>('fatigue')
  const [severity, setSeverity] = useState(5)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [triggers, setTriggers] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const toggleSymptom = (s: string) =>
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )

  const severityColor = severity <= 3
    ? 'var(--severity-1)'
    : severity <= 6
    ? 'var(--severity-5)'
    : 'var(--severity-10)'

  const handleSubmit = async () => {
    if (!address || !encryptionKey) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const payload: SymptomPayload = {
        symptoms: selectedSymptoms,
        notes,
        triggers: triggers.split(',').map((t) => t.trim()).filter(Boolean),
      }

      const encrypted = await encryptPayload(encryptionKey, payload)
      await createSymptomLog(address, category, severity, encrypted)

      setSuccess(true)
      setSelectedSymptoms([])
      setNotes('')
      setTriggers('')
      setSeverity(5)
      onLogged()
    } catch (err: any) {
      setError(err.message ?? 'Failed to log symptom')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Log Symptom</div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">✓ Symptom logged and encrypted on Arkiv</div>}

        <div className="form-grid">
          <div className="form-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as SymptomCategory)
                setSelectedSymptoms([])
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Severity — {severity}/10</label>
            <div className="severity-row">
              <input
                type="range"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                style={{ accentColor: severityColor }}
              />
              <span className="severity-value" style={{ color: severityColor }}>
                {severity}
              </span>
            </div>
          </div>

          <div className="form-group full">
            <label>Symptoms present</label>
            <div className="symptom-grid">
              {SYMPTOM_OPTIONS[category].map((s) => (
                <button
                  key={s}
                  className={`symptom-chip ${selectedSymptoms.includes(s) ? 'selected' : ''}`}
                  onClick={() => toggleSymptom(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group full">
            <label>Triggers (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. exercise, stress, poor sleep"
              value={triggers}
              onChange={(e) => setTriggers(e.target.value)}
            />
          </div>

          <div className="form-group full">
            <label>Notes</label>
            <textarea
              placeholder="Any additional observations…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Encrypting &amp; storing…
              </>
            ) : (
              '+ Log Symptom'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
