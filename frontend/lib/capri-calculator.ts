import type { Alert } from "@/types/alert"

// Critical Infrastructure Sectors
export const CRITICAL_SECTORS = [
  "Energy",
  "Healthcare",
  "Finance",
  "Transportation",
  "Water",
  "Communications",
  "Defense",
  "Manufacturing",
  "Food & Agriculture",
  "Government",
  "Chemical",
  "Nuclear",
  "Dams",
  "Emergency Services",
  "Information Technology",
] as const

export type CriticalSector = (typeof CRITICAL_SECTORS)[number]

// Intelligence Category Descriptions
export const INTELLIGENCE_CATEGORIES = {
  alerts: {
    name: "Alerts",
    weight: 30,
    description:
      "Traditional alert-based scoring from CISA advisories, vulnerability disclosures, and incident reports. Includes posture changes, exploitation indicators, and critical infrastructure targeting.",
  },
  research: {
    name: "Research Intelligence",
    weight: 20,
    description:
      "Academic and industry research including threat landscape analysis, security trend studies, and defensive capability assessments from universities and research institutions.",
  },
  threatIntel: {
    name: "Threat Intelligence",
    weight: 25,
    description:
      "Commercial TI feeds and analysis from security vendors covering APT campaigns, malware families, attack techniques, and threat actor profiling and attribution.",
  },
  vulnerability: {
    name: "Vulnerability Intelligence",
    weight: 15,
    description:
      "CVE research and disclosure trends including zero-day discoveries, exploit development timelines, patch adoption rates, and vulnerability impact assessments.",
  },
  geopolitical: {
    name: "Geopolitical Intelligence",
    weight: 10,
    description:
      "Nation-state activity and tensions including diplomatic cyber incidents, sanctions impacts, international conflict spillover, and state-sponsored threat actor campaigns.",
  },
} as const

interface SectorScore {
  sector: CriticalSector
  score: number
  breakdown: {
    P: number // National Posture
    X: number // Exploitation Observed
    S: number // Sector Match
    U: number // Urgency
    K: number // KEV Presence
    C: number // Critical Infrastructure
    A: number // Alert Targeting Score
    R: number // Research Intelligence
    T: number // Threat Intelligence
    CSS: number // Computed Sector Score
  }
  rationale: string
  categories: {
    alerts: number
    research: number
    threatIntel: number
    vulnerability: number
    geopolitical: number
  }
}

// Calculate CAPRI scores per critical infrastructure sector
export function calculateCapriScoresBySector(alerts: Alert[]): SectorScore[] {
  if (!alerts || alerts.length === 0) {
    return CRITICAL_SECTORS.map((sector) => ({
      sector,
      score: 2.5,
      breakdown: {
        P: 0.5,
        X: 0.5,
        S: 0.5,
        U: 0.5,
        K: 0.5,
        C: 0.5,
        A: 0.5,
        R: 0.5,
        T: 0.5,
        CSS: 0.5,
      },
      rationale: "Baseline score - insufficient sector-specific data",
      categories: {
        alerts: 0.5,
        research: 0.5,
        threatIntel: 0.5,
        vulnerability: 0.5,
        geopolitical: 0.5,
      },
    }))
  }

  return CRITICAL_SECTORS.map((sector) => {
    // Filter alerts for this specific sector
    const sectorAlerts = alerts.filter((alert) => alert.sector === sector)
    const hasAlerts = sectorAlerts.length > 0
    const mostRecentAlert = hasAlerts ? sectorAlerts[0] : alerts[0]

    // Base scoring components
    const postureScore = mostRecentAlert.posture === "Shields Up" ? 1.0 : 0.5
    const urgencyScore = mostRecentAlert.urgency === "High" ? 1.0 : mostRecentAlert.urgency === "Medium" ? 0.7 : 0.3
    const kevScore = mostRecentAlert.kev ? 1.0 : 0.3
    const exploitationScore = mostRecentAlert.exploitation ? 1.0 : 0.4
    const criticalInfraScore = mostRecentAlert.criticalInfrastructure ? 1.0 : 0.5

    // Sector-specific modifiers
    const sectorModifier = getSectorRiskModifier(sector, sectorAlerts.length)
    const sectorMatchScore = hasAlerts ? 1.0 : 0.3

    // Intelligence category scoring with sector-specific weighting
    const alertScore = hasAlerts
      ? (postureScore * 0.3 + urgencyScore * 0.3 + exploitationScore * 0.4) * sectorModifier
      : 0.4

    const researchScore = getSectorResearchScore(sector)
    const threatIntelScore = getSectorThreatIntelScore(sector, sectorAlerts)
    const vulnerabilityScore = getSectorVulnerabilityScore(sector, kevScore)
    const geopoliticalScore = getSectorGeopoliticalScore(sector)

    // Calculate weighted sector score
    const computedSectorScore =
      (alertScore * INTELLIGENCE_CATEGORIES.alerts.weight +
        researchScore * INTELLIGENCE_CATEGORIES.research.weight +
        threatIntelScore * INTELLIGENCE_CATEGORIES.threatIntel.weight +
        vulnerabilityScore * INTELLIGENCE_CATEGORIES.vulnerability.weight +
        geopoliticalScore * INTELLIGENCE_CATEGORIES.geopolitical.weight) /
      100

    const finalScore = 1 + computedSectorScore * 4

    // Generate sector-specific rationale
    const rationale = generateSectorRationale(sector, finalScore, hasAlerts, mostRecentAlert)

    return {
      sector,
      score: finalScore,
      breakdown: {
        P: postureScore,
        X: exploitationScore,
        S: sectorMatchScore,
        U: urgencyScore,
        K: kevScore,
        C: criticalInfraScore,
        A: 0.9,
        R: researchScore,
        T: threatIntelScore,
        CSS: computedSectorScore,
      },
      rationale,
      categories: {
        alerts: alertScore,
        research: researchScore,
        threatIntel: threatIntelScore,
        vulnerability: vulnerabilityScore,
        geopolitical: geopoliticalScore,
      },
    }
  })
}

// Sector-specific risk modifiers based on threat landscape
function getSectorRiskModifier(sector: CriticalSector, alertCount: number): number {
  const baseModifier = Math.min(1.2, 1.0 + alertCount * 0.1)

  const sectorRiskFactors: Record<CriticalSector, number> = {
    Energy: 1.2, // High-value target
    Healthcare: 1.15, // Ransomware target
    Finance: 1.1, // Regulatory scrutiny
    Defense: 1.25, // Nation-state targeting
    Government: 1.2, // APT targeting
    "Information Technology": 1.15, // Supply chain risks
    Transportation: 1.0,
    Water: 1.05,
    Communications: 1.1,
    Manufacturing: 1.0,
    "Food & Agriculture": 0.95,
    Chemical: 1.1,
    Nuclear: 1.3, // Highest risk
    Dams: 1.05,
    "Emergency Services": 1.1,
  }

  return baseModifier * sectorRiskFactors[sector]
}

// Sector-specific research intelligence scoring
function getSectorResearchScore(sector: CriticalSector): number {
  const researchActivity: Record<CriticalSector, number> = {
    "Information Technology": 0.9, // High research activity
    Finance: 0.85, // Strong research focus
    Healthcare: 0.8, // Medical device research
    Energy: 0.75, // ICS/SCADA research
    Defense: 0.7, // Classified research
    Government: 0.65,
    Communications: 0.75,
    Transportation: 0.6,
    Manufacturing: 0.65,
    Water: 0.55,
    Chemical: 0.6,
    Nuclear: 0.7, // Safety research
    "Food & Agriculture": 0.5,
    Dams: 0.5,
    "Emergency Services": 0.55,
  }

  return researchActivity[sector] + (Math.random() * 0.2 - 0.1) // Add some variance
}

// Sector-specific threat intelligence scoring
function getSectorThreatIntelScore(sector: CriticalSector, alerts: Alert[]): number {
  const tiCoverage: Record<CriticalSector, number> = {
    Finance: 0.9, // High TI coverage
    Energy: 0.85, // Critical infrastructure focus
    Healthcare: 0.8, // Ransomware focus
    Defense: 0.95, // Highest TI priority
    Government: 0.9, // APT focus
    "Information Technology": 0.85, // Supply chain focus
    Communications: 0.75,
    Transportation: 0.7,
    Manufacturing: 0.65,
    Water: 0.6,
    Chemical: 0.7,
    Nuclear: 0.8, // Security focus
    "Food & Agriculture": 0.5,
    Dams: 0.55,
    "Emergency Services": 0.6,
  }

  const baseScore = tiCoverage[sector]
  const alertBonus = Math.min(0.2, alerts.length * 0.05)
  return Math.min(1.0, baseScore + alertBonus)
}

// Sector-specific vulnerability intelligence scoring
function getSectorVulnerabilityScore(sector: CriticalSector, kevScore: number): number {
  const vulnExposure: Record<CriticalSector, number> = {
    "Information Technology": 0.9, // High vulnerability exposure
    Communications: 0.85,
    Finance: 0.8, // Regulated patching
    Healthcare: 0.75, // Legacy systems
    Energy: 0.7, // ICS vulnerabilities
    Manufacturing: 0.75, // IoT/OT systems
    Transportation: 0.7,
    Government: 0.65, // Better patching
    Defense: 0.6, // Hardened systems
    Water: 0.8, // Legacy SCADA
    Chemical: 0.75,
    Nuclear: 0.5, // Air-gapped systems
    "Food & Agriculture": 0.8, // IoT sensors
    Dams: 0.7,
    "Emergency Services": 0.75,
  }

  return vulnExposure[sector] * (1 - kevScore * 0.3) // KEV presence reduces score
}

// Sector-specific geopolitical intelligence scoring
function getSectorGeopoliticalScore(sector: CriticalSector): number {
  const geopoliticalRisk: Record<CriticalSector, number> = {
    Defense: 0.95, // Highest geopolitical targeting
    Government: 0.9, // State targeting
    Energy: 0.85, // Strategic resource
    Communications: 0.8, // Information warfare
    Finance: 0.75, // Economic warfare
    "Information Technology": 0.8, // Supply chain
    Nuclear: 0.9, // Strategic target
    Transportation: 0.7, // Logistics disruption
    Healthcare: 0.6, // Lower priority
    Water: 0.65, // Infrastructure target
    Manufacturing: 0.6,
    Chemical: 0.7, // Industrial target
    "Food & Agriculture": 0.5, // Lower priority
    Dams: 0.7, // Infrastructure
    "Emergency Services": 0.65,
  }

  return geopoliticalRisk[sector] + (Math.random() * 0.1 - 0.05) // Add variance
}

// Generate sector-specific rationale
function generateSectorRationale(sector: CriticalSector, score: number, hasAlerts: boolean, alert: Alert): string {
  if (score >= 4) {
    return hasAlerts
      ? `${sector}: Critical threat level with ${alert.posture} posture and active targeting`
      : `${sector}: Elevated baseline risk due to sector-specific threat landscape`
  } else if (score >= 3) {
    return hasAlerts
      ? `${sector}: Moderate threat activity with ${alert.urgency.toLowerCase()} priority indicators`
      : `${sector}: Standard monitoring with elevated intelligence indicators`
  } else {
    return `${sector}: Baseline monitoring posture with routine intelligence collection`
  }
}

// Legacy function for backward compatibility
export function calculateCapriScore(alerts: Alert[]) {
  const sectorScores = calculateCapriScoresBySector(alerts)
  // Return the highest scoring sector as the overall score
  const highestScore = sectorScores.reduce((prev, current) => (prev.score > current.score ? prev : current))

  return {
    score: highestScore.score,
    breakdown: highestScore.breakdown,
    rationale: `Overall: ${highestScore.rationale}`,
    categories: highestScore.categories,
  }
}
