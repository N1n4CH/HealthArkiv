import { useState } from 'react'
import { encryptPayload } from '../lib/crypto'
import { createBiomarker } from '../lib/arkiv'
import { useWallet } from '../hooks/useWallet'
import type { BiomarkerType, BiomarkerPayload } from '../lib/types'

const BIOMARKER_CONFIGS: Record<BiomarkerType, { label: string; unit: string; placeholder: string }> = {
  hrv: { label: 'Heart Rate Variability', unit: 'ms', placeholder: '45' },
  vo2max: { label: 'VO₂ Max', unit: 'ml/kg/min', placeholder: '38' },
  sleep_score: { label: 'Sleep Score', unit: '/100', placeholder: '74' },
  inflammation: { label: 'CRP / Inflammation', unit: 'mg/L', placeholder: '2.1' },
  bloodwork: { label: 'Bloodwork Result', unit: 'custom', placeholder: '12.5' },
  weight: { label: 'Weight', unit: 'kg', placeholder: '72' },
  blood_pressure: { label: 'Blood Pressure (systolic)', unit: 'mmHg', placeholder: '118' },
  glucose: { label: 'Glucose', unit: 'mmol/L', placeholder: '5.2' },
  custom: { label: 'Custom Biomarker', unit: 'custom', placeholder: '0' },
}

const SOURCES = ['Oura Ring', 'Apple Watch', 'Garmin', 'Whoop', 'Lab test', 'Manual entry', 'Other device']

interface Props {
  onLogged: () => void
}

export function BiomarkerLogger({ onLogged }: Props) {
  const { address, encryptionKey } = useWallet()
  const [type, setType] = useState<BiomarkerType>('hrv')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [source, setSource] = useState('Manual entry')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const config = BIOMARKER_CONFIGS[type]
  const displayUnit = unit || config.unit

  const handleSubmit = async () => {
    if (!address || !encryptionKey) return
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      setError('Please enter a valid numeric value')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const payload: BiomarkerPayload = {
        unit: displayUnit,
        source,
        notes,
        rawValue: value,
      }

      const encrypted = await encryptPayload(encryptionKey, payload)
      await createBiomarker(address, type, numValue, encrypted)

      setSuccess(true)
      setValue('')
      setNotes('')
      onLogged()
    } catch (err: any) {
      setError(err.message ?? 'Failed to log biomarker')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Log Biomarker</div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">✓ Biomarker logged and encrypted on Arkiv</div>}

        <div className="form-grid">
          <div className="form-group full">
            <label>Biomarker Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as BiomarkerType)}>
              {(Object.keys(BIOMARKER_CONFIGS) as BiomarkerType[]).map((t) => (
                <option key={t} value={t}>
                  {BIOMARKER_CONFIGS[t].label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Value ({config.unit})</label>
            <input
              type="number"
              placeholder={config.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              step="any"
            />
          </div>

          <div className="form-group">
            <label>Unit (override)</label>
            <input
              type="text"
              placeholder={config.unit}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <div className="form-group full">
            <label>Data Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group full">
            <label>Notes</label>
            <textarea
              placeholder="Context, conditions, test name…"
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
              '+ Log Biomarker'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
