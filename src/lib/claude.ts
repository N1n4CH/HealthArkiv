/**
 * Claude API integration for HealthArkiv
 *
 * Generates AI health insights from decrypted symptom and biomarker data.
 * All data is already decrypted client-side before being sent to Claude —
 * no raw encrypted blobs are ever sent to the API.
 */

import type { SymptomLog, Biomarker } from './types'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export interface HealthInsight {
  summary: string
  patterns: string[]
  recommendations: string[]
  longCovidRelevance?: string
}

export async function generateHealthInsights(
  symptoms: SymptomLog[],
  biomarkers: Biomarker[],
): Promise<HealthInsight> {
  if (!API_KEY) {
    throw new Error('VITE_ANTHROPIC_API_KEY not set in .env')
  }

  // Build a structured summary of recent data (last 30 entries)
  const recentSymptoms = symptoms.slice(0, 30).map((s) => ({
    date: new Date(s.date).toLocaleDateString(),
    category: s.category,
    severity: s.severity,
    symptoms: s.decrypted?.symptoms ?? [],
    notes: s.decrypted?.notes ?? '',
  }))

  const recentBiomarkers = biomarkers.slice(0, 20).map((b) => ({
    date: new Date(b.date).toLocaleDateString(),
    type: b.biomarkerType,
    value: b.value,
    unit: b.decrypted?.unit ?? '',
    source: b.decrypted?.source ?? '',
  }))

  const prompt = `You are a health data analyst helping a patient understand their symptom patterns. 
Analyse the following health data and provide actionable insights.

## Symptom Logs (most recent first)
${JSON.stringify(recentSymptoms, null, 2)}

## Biomarker Readings
${JSON.stringify(recentBiomarkers, null, 2)}

Respond ONLY with a valid JSON object (no markdown, no preamble) matching this exact shape:
{
  "summary": "2-3 sentence plain-language summary of overall health trends",
  "patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "longCovidRelevance": "1 sentence if any patterns suggest long COVID / post-viral syndrome, otherwise null"
}

Be specific, evidence-based, and compassionate. Do not diagnose. Flag if patterns suggest consulting a specialist.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data = await response.json()
  const text = data.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    return JSON.parse(text) as HealthInsight
  } catch {
    throw new Error('Failed to parse Claude response as JSON')
  }
}
