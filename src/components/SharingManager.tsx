import { useState, useEffect } from 'react'
import { createSharingGrant, fetchSharingGrants, revokeSharingGrant } from '../lib/arkiv'
import { useWallet } from '../hooks/useWallet'
import type { SharingGrant, GrantScope } from '../lib/types'

const SCOPE_LABELS: Record<GrantScope, string> = {
  symptoms: 'Symptoms only',
  biomarkers: 'Biomarkers only',
  all: 'Full access',
}

interface Props {
  refresh: number
  onUpdated: () => void
}

export function SharingManager({ refresh, onUpdated }: Props) {
  const { address } = useWallet()
  const [grants, setGrants] = useState<SharingGrant[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [doctorAddress, setDoctorAddress] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [scope, setScope] = useState<GrantScope>('symptoms')
  const [durationDays, setDurationDays] = useState(30)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (address) loadGrants()
  }, [address, refresh])

  const loadGrants = async () => {
    if (!address) return
    setLoading(true)
    try {
      const g = await fetchSharingGrants(address)
      setGrants(g)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!address) return
    if (!doctorAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
      setError('Enter a valid Ethereum address (0x…)')
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await createSharingGrant(address, doctorAddress, scope, durationDays, {
        doctorName,
        notes,
        patientAddress: address,
      })
      setSuccess(`Grant created for ${doctorName || doctorAddress.slice(0, 8) + '…'} — expires in ${durationDays} days`)
      setDoctorAddress('')
      setDoctorName('')
      setNotes('')
      onUpdated()
      await loadGrants()
    } catch (err: any) {
      setError(err.message ?? 'Failed to create grant')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (grant: SharingGrant) => {
    if (!address) return
    if (!confirm(`Revoke access for ${grant.doctorName || grant.grantedTo}?`)) return
    try {
      await revokeSharingGrant(address, grant.arkivEntityKey)
      setSuccess('Grant revoked')
      await loadGrants()
      onUpdated()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div>
      {/* Create new grant */}
      <div className="card">
        <div className="card-title">Grant Doctor Access</div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Share a scoped, time-limited view of your health data with a clinician.
          The grant is stored on Arkiv — tamper-proof, with automatic expiry.
          You can revoke it at any time.
        </p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">✓ {success}</div>}

        <div className="form-grid">
          <div className="form-group">
            <label>Doctor Name</label>
            <input
              type="text"
              placeholder="Dr. Sarah Chen"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Doctor Wallet Address</label>
            <input
              type="text"
              placeholder="0x…"
              value={doctorAddress}
              onChange={(e) => setDoctorAddress(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </div>

          <div className="form-group">
            <label>Data Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as GrantScope)}>
              {(Object.keys(SCOPE_LABELS) as GrantScope[]).map((s) => (
                <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Duration (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
            />
          </div>

          <div className="form-group full">
            <label>Notes for this grant</label>
            <input
              type="text"
              placeholder="e.g. Long COVID follow-up, 6-week review"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
            {submitting ? (
              <><span className="spinner" /> Creating grant…</>
            ) : (
              'Create Grant'
            )}
          </button>
        </div>
      </div>

      {/* Active grants */}
      <div className="card">
        <div className="card-title">Active Grants</div>

        {loading ? (
          <div className="loading"><span className="spinner" /> Loading grants from Arkiv…</div>
        ) : grants.length === 0 ? (
          <div className="empty" style={{ padding: '32px 0' }}>
            <div className="empty-text">No active sharing grants</div>
          </div>
        ) : (
          grants.map((grant) => (
            <div key={grant.arkivEntityKey} className="grant-card">
              <div className="grant-info">
                <div className="grant-doctor">{grant.doctorName || 'Unknown clinician'}</div>
                <div className="grant-meta">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {grant.grantedTo.slice(0, 6)}…{grant.grantedTo.slice(-4)}
                  </span>
                  <span>·</span>
                  <span>Granted {new Date(grant.grantedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <span className="scope-pill">{SCOPE_LABELS[grant.scope]}</span>
              <button className="btn btn-danger" onClick={() => handleRevoke(grant)}>
                Revoke
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
