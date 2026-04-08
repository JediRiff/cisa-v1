// CAPRI Unified Severity Classification
// Multi-signal severity classifier replacing keyword-only approach.
// Prevents the "everything is critical" problem.

import type { ThreatItem } from './feeds'

interface SeverityInput {
  title: string
  description: string
  source: string
  sourceType: ThreatItem['sourceType']
  aiSeverityScore?: number   // 1-10 from Claude analysis
  epssScore?: number         // 0-1 exploitation probability
  isKEV?: boolean            // CISA Known Exploited Vulnerability
}

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown'

/**
 * Multi-signal severity classifier.
 * Priority: AI score > EPSS > KEV status > refined keywords > source tier > fallback.
 */
export function classifySeverity(input: SeverityInput): Severity {
  // 1. AI severity score (most accurate signal when available)
  if (input.aiSeverityScore != null) {
    if (input.aiSeverityScore >= 9) return 'critical'
    if (input.aiSeverityScore >= 7) return 'high'
    if (input.aiSeverityScore >= 5) return 'medium'
    return 'low'
  }

  // 2. EPSS score (empirical exploitation probability)
  if (input.epssScore != null) {
    if (input.epssScore >= 0.5) return 'critical'
    if (input.epssScore >= 0.2) return 'high'
    if (input.epssScore >= 0.05) return 'medium'
    // Low EPSS + KEV = still high (it's confirmed exploited, just not widespread)
    if (input.isKEV) return 'high'
    return 'low'
  }

  // 3. KEV status: confirmed exploited, but not automatically critical
  // (without EPSS data, default to high rather than critical)
  if (input.isKEV) return 'high'

  // 4. Refined keyword analysis
  const text = (input.title + ' ' + input.description).toLowerCase()
  const severity = classifyByKeywords(text)

  // 5. Source tier boost: government advisories get +1 tier
  if (input.sourceType === 'government' && severity === 'medium') return 'high'
  if (input.sourceType === 'government' && severity === 'high') return 'critical'

  return severity
}

/**
 * Refined keyword-based severity classification.
 * Key improvement: "critical" only triggers on actual severity context,
 * not on phrases like "critical infrastructure" alone.
 */
function classifyByKeywords(text: string): Severity {
  // Active exploitation + ICS/energy context = critical
  if (/\b(actively exploit(ed|ing)|in.the.wild|zero-day|0-day)\b/.test(text) &&
      /\b(energy|scada|ics|plc|grid|power|nuclear|pipeline|utility)\b/.test(text)) {
    return 'critical'
  }

  // Explicit "critical severity" or "critical vulnerability" = critical
  if (/\bcritical\s+(severity|vulnerabilit|flaw|bug|patch|update|advisory)\b/.test(text)) {
    return 'critical'
  }

  // Destructive malware = critical
  if (/\b(ransomware|wiper|destructive|supply.chain.attack)\b/.test(text)) return 'critical'

  // RCE with ICS/energy context = critical
  if (/\b(remote code execution|rce)\b/.test(text) &&
      /\b(scada|ics|plc|hmi|rtu|dcs|energy|grid|power|industrial)\b/.test(text)) {
    return 'critical'
  }

  // Active exploitation without energy context = high
  if (/\b(actively exploit(ed|ing)|zero-day|0-day)\b/.test(text)) return 'high'

  // RCE without energy context = high
  if (/\b(remote code execution|rce)\b/.test(text)) return 'high'

  // Nation-state / APT indicators = high
  if (/\b(apt\d+|volt typhoon|salt typhoon|sandworm|lazarus|kimsuky|xenotime|chernovite|kamacite|nation.state|state.sponsored|advanced persistent threat)\b/.test(text)) {
    return 'high'
  }

  // ICS/SCADA specific threats = high
  if (/\b(scada|plc|hmi|rtu|dcs|modbus|dnp3|iec.61850|industroyer|crashoverride|triton|pipedream|incontroller|frostygoop|cosmicenergy)\b/.test(text)) {
    return 'high'
  }

  // Explicit severity keywords
  if (/\bhigh\s+severity\b/.test(text) || /\bsevere\b/.test(text) || /\burgent\b/.test(text)) return 'high'
  if (/\bmedium\s+severity\b/.test(text) || /\bmoderate\b/.test(text)) return 'medium'
  if (/\blow\s+severity\b/.test(text) || /\binformational\b/.test(text)) return 'low'

  // "critical infrastructure" without a vulnerability = medium (not critical)
  if (/\bcritical infrastructure\b/.test(text)) return 'medium'

  // General threat/vuln indicators = medium
  if (/\b(vulnerability|exploit|attack|malware|threat|breach|backdoor|trojan|phishing|campaign|intrusion|compromise)\b/.test(text)) {
    return 'medium'
  }

  // Security vendor content with substance = medium
  if (text.length > 50) return 'medium'

  return 'unknown'
}
