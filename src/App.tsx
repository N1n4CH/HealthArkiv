import { useState } from 'react'
import { useWallet } from './hooks/useWallet'
import { Dashboard } from './components/Dashboard'
import { SymptomLogger } from './components/SymptomLogger'
import { BiomarkerLogger } from './components/BiomarkerLogger'
import { SharingManager } from './components/SharingManager'
import { AIInsights } from './components/AIInsights'

type Tab = 'dashboard' | 'symptoms' | 'biomarkers' | 'share' | 'insights'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Timeline' },
  { id: 'symptoms', label: 'Log Symptom' },
  { id: 'biomarkers', label: 'Log Biomarker' },
  { id: 'share', label: 'Share' },
  { id: 'insights', label: '✦ AI Insights' },
]

export function App() {
  const { address, isConnecting, error, connect, disconnect } = useWallet()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [refresh, setRefresh] = useState(0)

  const bump = () => setRefresh((n) => n + 1)

  const shortAddr = address
    ? address.slice(0, 6) + '…' + address.slice(-4)
    : null

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-health">Health</span>
          <span className="logo-arkiv">Arkiv</span>
          <span className="logo-tag">Private Health Data · Braga Testnet</span>
        </div>

        {address ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wallet-address">
              <span className="wallet-dot" />
              {shortAddr}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={connect} disabled={isConnecting}>
            {isConnecting ? (
              <><span className="spinner" /> Connecting…</>
            ) : (
              'Connect Wallet'
            )}
          </button>
        )}
      </header>

      {/* Not connected */}
      {!address && (
        <div className="landing">
          <h1 className="landing-title">
            Your health data.<br />Your keys.
          </h1>
          <p className="landing-sub">
            HealthArkiv stores encrypted symptom logs, biomarkers, and clinical grants
            on Arkiv — Ethereum's data layer. Only your wallet can decrypt it.
          </p>
          <div className="landing-features">
            <span className="feature-pill">🔐 End-to-end encrypted</span>
            <span className="feature-pill">⛓ On-chain, tamper-proof</span>
            <span className="feature-pill">🩺 Shareable with doctors</span>
            <span className="feature-pill">🤖 AI pattern analysis</span>
            <span className="feature-pill">🫁 Long COVID ready</span>
          </div>
          {error && <div className="error-msg" style={{ maxWidth: 420 }}>{error}</div>}
          <button className="btn btn-primary" onClick={connect} disabled={isConnecting} style={{ fontSize: 16, padding: '14px 32px' }}>
            {isConnecting ? <><span className="spinner" /> Connecting…</> : 'Connect MetaMask to Start'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            You'll sign one message to derive your encryption key. No gas needed to start.
          </p>
        </div>
      )}

      {/* Connected */}
      {address && (
        <>
          <nav className="tabs">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`tab ${tab === id ? 'active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === 'dashboard' && <Dashboard refresh={refresh} />}
          {tab === 'symptoms' && (
            <SymptomLogger onLogged={() => { bump(); setTab('dashboard') }} />
          )}
          {tab === 'biomarkers' && (
            <BiomarkerLogger onLogged={() => { bump(); setTab('dashboard') }} />
          )}
          {tab === 'share' && <SharingManager refresh={refresh} onUpdated={bump} />}
          {tab === 'insights' && <AIInsights />}
        </>
      )}
    </div>
  )
}
