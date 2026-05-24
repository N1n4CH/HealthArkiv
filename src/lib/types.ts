// ── Arkiv entity types ──────────────────────────────────────────────────────

export const PROJECT_ATTRIBUTE = { key: 'project', value: 'healtharkiv-v1' }

export type SymptomCategory =
  | 'fatigue'
  | 'cognitive'
  | 'pain'
  | 'cardiac'
  | 'sleep'
  | 'gut'
  | 'mood'
  | 'respiratory'
  | 'other'

export type BiomarkerType =
  | 'hrv'
  | 'vo2max'
  | 'sleep_score'
  | 'inflammation'
  | 'bloodwork'
  | 'weight'
  | 'blood_pressure'
  | 'glucose'
  | 'custom'

export type GrantScope = 'symptoms' | 'biomarkers' | 'all'

// Raw (unencrypted) symptom payload stored in entity
export interface SymptomPayload {
  symptoms: string[]
  notes: string
  triggers: string[]
}

// Raw (unencrypted) biomarker payload
export interface BiomarkerPayload {
  unit: string
  source: string
  notes: string
  rawValue: string
}

// Sharing grant payload (not encrypted — it's metadata)
export interface SharingGrantPayload {
  doctorName: string
  notes: string
  patientAddress: string
}

// ── App state types ──────────────────────────────────────────────────────────

export interface SymptomLog {
  arkivEntityKey: string
  entityType: 'symptom_log'
  date: number
  category: SymptomCategory
  severity: number
  encryptedPayload: string
  // Decrypted at runtime, not stored
  decrypted?: SymptomPayload
}

export interface Biomarker {
  arkivEntityKey: string
  entityType: 'biomarker'
  date: number
  biomarkerType: BiomarkerType
  value: number
  encryptedPayload: string
  decrypted?: BiomarkerPayload
}

export interface SharingGrant {
  arkivEntityKey: string
  entityType: 'sharing_grant'
  grantedTo: string
  scope: GrantScope
  grantedAt: number
  // payload decoded from arkiv entity
  doctorName?: string
  notes?: string
}

export interface WalletState {
  address: string | null
  isConnecting: boolean
  error: string | null
  encryptionKey: CryptoKey | null
}

export type AppTab = 'dashboard' | 'log-symptom' | 'log-biomarker' | 'share' | 'insights'
