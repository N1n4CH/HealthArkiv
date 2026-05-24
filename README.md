# HealthArkiv

**Private, user-owned health tracking on Arkiv — Ethereum's data layer.**

Log symptoms, biomarkers, and long COVID indicators. Share selective, time-limited access with clinicians. Analyse patterns with AI. Your wallet is the only key.

---

## Why HealthArkiv

Apps like Flo, Clue, and many wearable platforms sell your most sensitive health data to insurers, advertisers, and data brokers. Post-Roe, symptom data has been subpoenaed. HealthArkiv inverts this: your data lives on Arkiv, encrypted with a key only your wallet controls. No platform can read it. No platform can sell it.

---

## Architecture

```
User (MetaMask)
  │
  ├── Signs deterministic message → AES-GCM key derived in browser
  ├── Encrypts payload before writing to Arkiv
  └── Decrypts payload after reading from Arkiv

Arkiv Braga Testnet
  ├── SymptomLog entities (encrypted payload, queryable attributes)
  ├── Biomarker entities (encrypted payload, numeric value queryable)
  └── SharingGrant entities (plaintext metadata, Arkiv TTL = auto-expiry)

Claude API (client-side)
  └── Receives decrypted data → returns pattern analysis JSON
```

### Entity Types

| Entity | PROJECT_ATTRIBUTE | Key Attributes |
|---|---|---|
| `SymptomLog` | `healtharkiv-v1` | `entityType`, `category`, `severity` (numeric), `date` (numeric), `owner` |
| `Biomarker` | `healtharkiv-v1` | `entityType`, `biomarkerType`, `value` (numeric), `date` (numeric), `owner` |
| `SharingGrant` | `healtharkiv-v1` | `entityType`, `grantedTo`, `scope`, `grantedAt` (numeric), `owner` |

### Privacy Model

- Payloads encrypted with AES-GCM using a key derived from the user's MetaMask signature
- Attributes (category, severity, date) are queryable metadata — no personal content stored in plaintext
- SharingGrant uses Arkiv's native `expiresIn` TTL for automatic access revocation
- Claude API receives only decrypted data, processed locally — never stored

---

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Data layer**: Arkiv Braga testnet (`@arkiv-network/sdk`)
- **Wallet**: MetaMask (via `window.ethereum`)
- **Encryption**: Web Crypto API (AES-GCM, key derived from wallet signature)
- **AI**: Claude Sonnet 4 via Anthropic API

---

## Setup

### Prerequisites

- Node.js 22+ (or Bun 1.x)
- MetaMask browser extension
- Test ETH on Arkiv Braga testnet — get it from the [Braga faucet](https://faucet.arkiv.network)

### Install

```bash
git clone https://github.com/YOUR_HANDLE/healtharkiv
cd healtharkiv
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Get your Claude API key at [console.anthropic.com](https://console.anthropic.com).

### Add Braga testnet to MetaMask

1. Open MetaMask → Settings → Networks → Add Network
2. Or visit the [Arkiv docs](https://docs.arkiv.network/networks/braga/) to add automatically

Network details:
- **Network Name**: Arkiv Braga
- **RPC URL**: https://braga.rpc.arkiv.network (check docs for current URL)
- **Chain ID**: check docs
- **Currency**: ETH

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for production

```bash
npm run build
npm run preview
```

---

## Usage

1. **Connect** MetaMask — you'll sign one message to derive your encryption key (no gas)
2. **Log Symptom** — select category, severity, specific symptoms; everything is encrypted before storage
3. **Log Biomarker** — HRV, sleep score, bloodwork, and more from any device
4. **Share** — create a time-limited access grant for a clinician by entering their wallet address; they can verify the grant exists on-chain
5. **AI Insights** — generate Claude-powered pattern analysis from your decrypted data

---

## Hackathon Submission

- **Theme**: AI + Privacy hybrid
- **Challenge**: ETHNS × Arkiv Builder Challenge
- **Testnet**: Arkiv Braga
- **PROJECT_ATTRIBUTE**: `{ key: "project", value: "healtharkiv-v1" }`

---

## Disclaimer

HealthArkiv is a hackathon prototype. It does not provide medical advice. Always consult a qualified clinician before making health decisions.
