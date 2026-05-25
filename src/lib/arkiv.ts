/**
 * Arkiv integration for HealthArkiv
 *
 * All entities carry PROJECT_ATTRIBUTE so they're namespaced
 * to this app and queryable without collision.
 *
 * Chain: Braga testnet
 */

import { createPublicClient, createWalletClient, custom, http } from '@arkiv-network/sdk'
import { braga } from '@arkiv-network/sdk/chains'
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils'
import { eq, desc } from '@arkiv-network/sdk/query'
import {
  PROJECT_ATTRIBUTE,
  type SymptomLog,
  type Biomarker,
  type SharingGrant,
  type SymptomCategory,
  type BiomarkerType,
  type GrantScope,
  type SharingGrantPayload,
} from './types'

// ── Clients ──────────────────────────────────────────────────────────────────

export const publicClient = createPublicClient({
  chain: braga,
  transport: http(),
})

export function getWalletClient(address: string) {
  const ethereum = (window as any).ethereum
  if (!ethereum) throw new Error('MetaMask not found')
  return createWalletClient({
    chain: braga,
    transport: custom(ethereum),
    account: (address as `0x${string}`),
  })
}

// ── SymptomLog ────────────────────────────────────────────────────────────────

export async function createSymptomLog(
  address: string,
  category: SymptomCategory,
  severity: number,
  encryptedPayload: string,
): Promise<string> {
  const client = getWalletClient(address)
  const now = Date.now()

  const { entityKey } = await client.createEntity({
    payload: jsonToPayload({
      entityType: 'symptom_log',
      encryptedPayload,
    }),
    contentType: 'application/json',
    attributes: [
      PROJECT_ATTRIBUTE,
      { key: 'entityType', value: 'symptom_log' },
      { key: 'category', value: category },
      { key: 'severity', value: severity },
      { key: 'date', value: now },
      { key: 'owner', value: address.toLowerCase() },
    ],
    expiresIn: ExpirationTime.fromDays(365),
  })

  return entityKey
}

export async function fetchSymptomLogs(address: string): Promise<SymptomLog[]> {
  const query = publicClient.buildQuery()
  const result = await query
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq('entityType', 'symptom_log'),
      eq('owner', address.toLowerCase()),
    ])
    .withPayload(true)
    .withMetadata(true)
    .withAttributes(true)
    .orderBy(desc('date', 'number'))
    .limit(100)
    .fetch()

  return result.entities
    .map((entity: any) => {
      try {
        const data = entity.toJson()
        return {
          arkivEntityKey: entity.key,
          entityType: 'symptom_log' as const,
          date: Number(entity.getAttribute?.('date') ?? Date.now()),
          category: (entity.getAttribute?.('category') ?? 'other') as SymptomCategory,
          severity: Number(entity.getAttribute?.('severity') ?? 5),
          encryptedPayload: data.encryptedPayload ?? '',
        }
      } catch {
        return null
      }
    })
    .filter((x: any): x is SymptomLog => x !== null)
}

// ── Biomarker ─────────────────────────────────────────────────────────────────

export async function createBiomarker(
  address: string,
  biomarkerType: BiomarkerType,
  value: number,
  encryptedPayload: string,
): Promise<string> {
  const client = getWalletClient(address)
  const now = Date.now()

  const { entityKey } = await client.createEntity({
    payload: jsonToPayload({
      entityType: 'biomarker',
      encryptedPayload,
    }),
    contentType: 'application/json',
    attributes: [
      PROJECT_ATTRIBUTE,
      { key: 'entityType', value: 'biomarker' },
      { key: 'biomarkerType', value: biomarkerType },
      { key: 'value', value },
      { key: 'date', value: now },
      { key: 'owner', value: address.toLowerCase() },
    ],
    expiresIn: ExpirationTime.fromDays(365),
  })

  return entityKey
}

export async function fetchBiomarkers(address: string): Promise<Biomarker[]> {
  const query = publicClient.buildQuery()
  const result = await query
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq('entityType', 'biomarker'),
      eq('owner', address.toLowerCase()),
    ])
    .withPayload(true)
    .withMetadata(true)
    .withAttributes(true)
    .orderBy(desc('date', 'number'))
    .limit(100)
    .fetch()

  return result.entities
    .map((entity: any) => {
      try {
        const data = entity.toJson()
        return {
          arkivEntityKey: entity.key,
          entityType: 'biomarker' as const,
          date: Number(entity.getAttribute?.('date') ?? Date.now()),
          biomarkerType: (entity.getAttribute?.('biomarkerType') ?? 'custom') as BiomarkerType,
          value: Number(entity.getAttribute?.('value') ?? 0),
          encryptedPayload: data.encryptedPayload ?? '',
        }
      } catch {
        return null
      }
    })
    .filter((x: any): x is Biomarker => x !== null)
}

// ── SharingGrant ──────────────────────────────────────────────────────────────

export async function createSharingGrant(
  address: string,
  grantedTo: string,
  scope: GrantScope,
  durationDays: number,
  payload: SharingGrantPayload,
): Promise<string> {
  const client = getWalletClient(address)
  const now = Date.now()

  const { entityKey } = await client.createEntity({
    payload: jsonToPayload({
      entityType: 'sharing_grant',
      ...payload,
    }),
    contentType: 'application/json',
    attributes: [
      PROJECT_ATTRIBUTE,
      { key: 'entityType', value: 'sharing_grant' },
      { key: 'grantedTo', value: grantedTo.toLowerCase() },
      { key: 'scope', value: scope },
      { key: 'grantedAt', value: now },
      { key: 'owner', value: address.toLowerCase() },
    ],
    expiresIn: ExpirationTime.fromDays(durationDays),
  })

  return entityKey
}

export async function fetchSharingGrants(address: string): Promise<SharingGrant[]> {
  const query = publicClient.buildQuery()
  const result = await query
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq('entityType', 'sharing_grant'),
      eq('owner', address.toLowerCase()),
    ])
    .withPayload(true)
    .withMetadata(true)
    .withAttributes(true)
    .fetch()

  return result.entities
    .map((entity: any) => {
      try {
        const data = entity.toJson()
        return {
          arkivEntityKey: entity.key,
          entityType: 'sharing_grant' as const,
          grantedTo: entity.getAttribute?.('grantedTo') ?? '',
          scope: (entity.getAttribute?.('scope') ?? 'symptoms') as GrantScope,
          grantedAt: Number(entity.getAttribute?.('grantedAt') ?? Date.now()),
          doctorName: data.doctorName,
          notes: data.notes,
        } satisfies SharingGrant
      } catch {
        return null
      }
    })
    .filter((x: any) => x !== null) as SharingGrant[]
}

export async function revokeSharingGrant(address: string, entityKey: string): Promise<void> {
  const client = getWalletClient(address)
  await client.deleteEntity({ entityKey: entityKey as `0x${string}` })
}

export async function fetchGrantsForDoctor(
  patientAddress: string,
  doctorAddress: string,
): Promise<SharingGrant[]> {
  const query = publicClient.buildQuery()
  const result = await query
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq('entityType', 'sharing_grant'),
      eq('owner', patientAddress.toLowerCase()),
      eq('grantedTo', doctorAddress.toLowerCase()),
    ])
    .withPayload(true)
    .withAttributes(true)
    .fetch()

  return result.entities
    .map((entity: any) => {
      try {
        const data = entity.toJson()
        return {
          arkivEntityKey: entity.key,
          entityType: 'sharing_grant' as const,
          grantedTo: doctorAddress,
          scope: (entity.getAttribute?.('scope') ?? 'symptoms') as GrantScope,
          grantedAt: Number(entity.getAttribute?.('grantedAt') ?? Date.now()),
          doctorName: data.doctorName,
          notes: data.notes,
        } satisfies SharingGrant
      } catch {
        return null
      }
    })
    .filter((x: any) => x !== null) as SharingGrant[]
}