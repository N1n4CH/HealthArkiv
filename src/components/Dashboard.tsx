import { useState, useEffect } from 'react'
import { fetchSymptomLogs, fetchBiomarkers } from '../lib/arkiv'
import { decryptPayload } from '../lib/crypto'
import { useWallet } from '../hooks/useWallet'
import type { SymptomLog, Biomarker, SymptomPayload, BiomarkerPayload } from '../lib/types'

type Entry =
  | (SymptomLog & { kind: 'symptom' })
  | (Biomarker & { kind: 'biomarker' })

const CATEGORY_COLORS: Record<string, string> = {
  fatigue: '#e05550',
  cognitive: '#a78bfa',
  pain: '#f0a030',
  cardiac: '#e05550',
  sleep: '#60a5fa',
  gut: '#34d399',
  mood: '#f472b6',
  respiratory: '#7dd3fc',
  other: '#6b7280',
}

const BIOMARKER_COLORS: Record<string, string> = {
  hrv: '#10c98e',
  vo2max: '#10c98e',
  sleep_score: '#60a5fa',
  inflammation: '#e05550',
  bloodwork: '#f0a030',
  default: '#7aada0',
}

interface Props {
  refresh: number
}

export function Dashboard({ refresh }: Props) {
  const { address, encryptionKey } = useWallet()
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([])
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address || !encryptionKey) return
    load()
  }, [address, encryptionKey, refresh])

  const load = async () => {
    if (!address || !encryptionKey) return
    setLoading(true)
    setError(null)
    try {
      const [s, b] = await Promise.all([
        fetchSymptomLogs(address),
        fetchBiomarkers(address),
      ])

      // Decrypt in parallel (best-effort)
      const decryptedSymptoms = await Promise.all(
        s.map(async (sym) => {
          try {
            const dec = await decryptPayload<SymptomPayload>(encryptionKey, sym.encryptedPayload)
            return { ...sym, decrypted: dec }
          } catch {
            return sym
          }
        }),
      )

      const decryptedBiomarkers = await Promise.all(
        b.map(async (bio) => {
          try {
            const dec = await decryptPayload<BiomarkerPayload>(encryptionKey, bio.encryptedPayload)
            return { ...bio, decrypted: dec }
          } catch {
            return bio
          }
        }),
      )

      setSymptoms(decryptedSymptoms)
      setBiomarkers(decryptedBiomarkers)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Merge + sort by date desc
  const entries: Entry[] = [
    ...symptoms.map((s) => ({ ...s, kind: 'symptom' as const })),
    ...biomarkers.map((b) => ({ ...b, kind: 'biomarker' as const })),
  ].sort((a, b) => b.date - a.date)

  const avgSeverity =
    symptoms.length > 0
      ? Math.round((symptoms.reduce((acc, s) => acc + s.severity, 0) / symptoms.length) * 10) / 10
      : null

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner" /> Loading encrypted data from Arkiv…
      </div>
    )
  }

  if (error) return <div className="error-msg">{error}</div>

  return (
    <div>
      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{symptoms.length}</div>
          <div className="stat-label">Symptom Logs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{biomarkers.length}</div>
          <div className="stat-label">Biomarkers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: avgSeverity && avgSeverity > 6 ? 'var(--red)' : 'var(--jade)' }}>
            {avgSeverity ?? '—'}
          </div>
          <div className="stat-label">Avg Severity</div>
        </div>
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔐</div>
          <div className="empty-text">No entries yet. Start logging your health data above.</div>
        </div>
      ) : (
        <div className="timeline">
          {entries.map((entry) => {
            if (entry.kind === 'symptom') {
              const color = CATEGORY_COLORS[entry.category] ?? '#6b7280'
              const sevColor =
                entry.severity <= 3
                  ? 'var(--severity-1)'
                  : entry.severity <= 6
                  ? 'var(--severity-5)'
                  : 'var(--severity-10)'
              return (
                <div key={entry.arkivEntityKey} className="timeline-item">
                  <div className="timeline-date">
                    {new Date(entry.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })}
                    <br />
                    <span style={{ fontSize: 10 }}>
                      {new Date(entry.date).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="timeline-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="category-badge"
                        style={{ background: color + '20', color }}
                      >
                        {entry.category}
                      </span>
                    </div>
                    <div className="timeline-detail">
                      {entry.decrypted?.symptoms?.join(', ') || '(encrypted)'}
                      {entry.decrypted?.notes && ` · ${entry.decrypted.notes}`}
                    </div>
                  </div>
                  <div
                    className="severity-badge"
                    style={{ background: sevColor + '20', color: sevColor }}
                  >
                    {entry.severity}
                  </div>
                </div>
              )
            } else {
              const color = BIOMARKER_COLORS[entry.biomarkerType] ?? BIOMARKER_COLORS.default
              return (
                <div key={entry.arkivEntityKey} className="timeline-item">
                  <div className="timeline-date">
                    {new Date(entry.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })}
                    <br />
                    <span style={{ fontSize: 10 }}>
                      {new Date(entry.date).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="timeline-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="category-badge"
                        style={{ background: color + '20', color }}
                      >
                        {entry.biomarkerType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="timeline-detail">
                      {entry.decrypted?.source ?? 'Manual'} ·{' '}
                      {entry.decrypted?.notes || ''}
                    </div>
                  </div>
                  <div
                    className="severity-badge"
                    style={{ background: color + '20', color, fontSize: 11 }}
                  >
                    {entry.value}
                    <span style={{ fontSize: 9, marginLeft: 2 }}>
                      {entry.decrypted?.unit ?? ''}
                    </span>
                  </div>
                </div>
              )
            }
          })}
        </div>
      )}
    </div>
  )
}
