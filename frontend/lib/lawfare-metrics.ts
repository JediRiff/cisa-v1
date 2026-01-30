// Lawfare Research Framework Integration
// Based on "Are Cyber Defenders Winning?" by Jason Healey & Tarang Jain

export interface LawfareMetrics {
  threat: {
    operations: {
      ttpsComplexity: number // Shift from easier to harder TTPs
      humanDependentBreaches: number // Decrease in social engineering success
      detectionTime: number // Mean time to detect (days)
      dwellTime: number // Time attackers remain undetected (days)
      internalDetectionRate: number // % detected internally vs externally
      vulnerabilityTurnover: number // Speed of vulnerability exploitation
      zeroDayPrice: number // Market price indicator
    }
    ecosystem: {
      threatActorProfits: number // Estimated revenue decline
      consolidationIndex: number // Fewer, larger threat groups
      trustIndex: number // Inter-group cooperation decline
      talentRecruitment: number // Difficulty recruiting
    }
  }
  vulnerability: {
    software: {
      severityScore: number // Average vulnerability severity
      diversityIndex: number // Vulnerability type distribution
      patchingSpeed: number // Days to patch critical vulns
      abandonedCodeRatio: number // Legacy/unsupported software %
      memoryUnsafeVulns: number // Memory safety vulnerability %
      owaspTop10Compliance: number // % apps without OWASP Top 10 flaws
    }
  }
  consequence: {
    incidents: {
      totalIncidents: number // Overall incident count
      recordsStolen: number // Data breach volume
      cascadingIncidents: number // Multi-victim attacks
      nationalSecurityIncidents: number // Gov/critical infrastructure
      emergencyDeclarations: number // State/federal emergency declarations
    }
    costs: {
      ransomwareRevenue: number // Total payments to threat actors
      averageLoss: number // Per-incident cost
      catastrophicIncidents: number // High-impact events
      insurancePayouts: number // Cyber insurance claims
      creditDowngrades: number // Moody's cyber-related downgrades
    }
  }
}

// Generate realistic metrics based on Lawfare research findings
export function generateLawfareMetrics(): LawfareMetrics {
  return {
    threat: {
      operations: {
        ttpsComplexity: 3.2, // Increasing complexity (1-5 scale)
        humanDependentBreaches: 0.68, // Down from ~0.82 in 2021
        detectionTime: 12, // Down from 400+ days in 2011
        dwellTime: 16, // Days before ejection
        internalDetectionRate: 0.47, // Up from ~0.35 historically
        vulnerabilityTurnover: 5, // Days from disclosure to exploitation (down from 63)
        zeroDayPrice: 2.5, // Relative price increase (1-5 scale)
      },
      ecosystem: {
        threatActorProfits: 0.65, // 35% revenue decline per Chainalysis
        consolidationIndex: 3.8, // Fewer, larger groups (1-5 scale)
        trustIndex: 2.1, // Decreased cooperation (1-5 scale)
        talentRecruitment: 3.7, // Increased difficulty (1-5 scale)
      },
    },
    vulnerability: {
      software: {
        severityScore: 6.2, // CVSS average (down from historical ~7.1)
        diversityIndex: 3.4, // More diverse vulnerability types (1-5)
        patchingSpeed: 37, // Down from 112 days (Cobalt data)
        abandonedCodeRatio: 0.23, // 23% legacy/unsupported
        memoryUnsafeVulns: 0.35, // Down from 0.70 (50% reduction in Android)
        owaspTop10Compliance: 0.52, // 52% apps without OWASP Top 10 flaws
      },
    },
    consequence: {
      incidents: {
        totalIncidents: 847000, // FBI IC3 complaints (increasing trend)
        recordsStolen: 2.6e9, // Billions of records (annual estimate)
        cascadingIncidents: 23, // Major multi-victim attacks
        nationalSecurityIncidents: 156, // Critical infrastructure targeting
        emergencyDeclarations: 8, // State/federal cyber emergencies
      },
      costs: {
        ransomwareRevenue: 1.1e9, // $1.1B (down 35% per Chainalysis)
        averageLoss: 4.88e6, // $4.88M per IBM (increasing)
        catastrophicIncidents: 12, // Major impact events
        insurancePayouts: 2.1e9, // Cyber insurance claims
        creditDowngrades: 34, // Moody's cyber-related downgrades
      },
    },
  }
}

// Calculate Lawfare-based CAPRI score
export function calculateLawfareCapriScore(metrics: LawfareMetrics): number {
  // Threat improvements (lower is better for most)
  const threatScore =
    (5 - metrics.threat.operations.ttpsComplexity) * 0.15 + // Higher complexity = better defense
    (1 - metrics.threat.operations.humanDependentBreaches) * 0.15 + // Lower social engineering = better
    (Math.max(0, 100 - metrics.threat.operations.detectionTime) / 100) * 0.2 + // Faster detection = better
    metrics.threat.operations.internalDetectionRate * 0.15 + // Higher internal detection = better
    (Math.max(0, 60 - metrics.threat.operations.vulnerabilityTurnover) / 60) * 0.1 + // Slower exploitation = better
    (5 - metrics.threat.ecosystem.threatActorProfits * 5) * 0.25 // Lower profits = better

  // Vulnerability improvements (lower severity, faster patching = better)
  const vulnScore =
    (Math.max(0, 10 - metrics.vulnerability.software.severityScore) / 10) * 0.25 + // Lower severity = better
    (metrics.vulnerability.software.diversityIndex / 5) * 0.15 + // More diversity = better
    (Math.max(0, 120 - metrics.vulnerability.software.patchingSpeed) / 120) * 0.25 + // Faster patching = better
    (1 - metrics.vulnerability.software.abandonedCodeRatio) * 0.15 + // Less abandoned code = better
    (1 - metrics.vulnerability.software.memoryUnsafeVulns) * 0.2 // Fewer memory unsafe = better

  // Consequence (mixed signals - some improving, some worsening)
  const consequenceScore =
    (Math.max(0, 1000000 - metrics.consequence.incidents.totalIncidents) / 1000000) * 0.2 + // Fewer incidents = better
    (Math.max(0, 50 - metrics.consequence.incidents.cascadingIncidents) / 50) * 0.3 + // Fewer cascading = better
    (Math.max(0, 10e9 - metrics.consequence.costs.ransomwareRevenue) / 10e9) * 0.25 + // Lower ransom revenue = better
    (Math.max(0, 50 - metrics.consequence.costs.catastrophicIncidents) / 50) * 0.25 // Fewer catastrophic = better

  // Weighted final score (1-5 scale)
  const finalScore = 1 + (threatScore * 0.4 + vulnScore * 0.35 + consequenceScore * 0.25) * 4

  return Math.max(1, Math.min(5, finalScore))
}

// Generate trend analysis based on Lawfare findings
export function generateLawfareTrends() {
  return {
    positive: [
      {
        metric: "TTP Complexity",
        trend: "↗️ +23%",
        description: "Attackers forced to use more sophisticated techniques",
        source: "Verizon DBIR 2025, Mandiant",
      },
      {
        metric: "Detection Speed",
        trend: "↗️ -97%",
        description: "Mean time to detect dropped from 400+ days to ~12 days",
        source: "Mandiant, Verizon, SecureWorks",
      },
      {
        metric: "Software Security",
        trend: "↗️ +63%",
        description: "Apps without OWASP Top 10 flaws increased from 32% to 52%",
        source: "Veracode State of Software Security",
      },
      {
        metric: "Patch Speed",
        trend: "↗️ -67%",
        description: "Median time to resolve serious vulnerabilities: 112→37 days",
        source: "Cobalt Penetration Testing",
      },
      {
        metric: "Memory Safety",
        trend: "↗️ -50%",
        description: "Memory-unsafe vulnerabilities reduced by half in Android",
        source: "Google Security Research",
      },
      {
        metric: "Ransomware Revenue",
        trend: "↗️ -35%",
        description: "Total ransomware payments down despite more victims",
        source: "Chainalysis Crypto Crime Report",
      },
    ],
    concerning: [
      {
        metric: "Total Incidents",
        trend: "↘️ +650%",
        description: "Reported incidents increased 6.5x since 2008",
        source: "Cyentia IRIS Report",
      },
      {
        metric: "Median Losses",
        trend: "↘️ +1520%",
        description: "Per-incident losses increased 15.2x in constant dollars",
        source: "Cyentia IRIS Report",
      },
      {
        metric: "Emergency Declarations",
        trend: "↘️ +∞",
        description: "Cyber-related emergency declarations: 0 (pre-2015) → 8+ (2024)",
        source: "Public reporting analysis",
      },
      {
        metric: "Credit Downgrades",
        trend: "↘️ +340%",
        description: "Cyber-related negative credit events increasing",
        source: "Moody's Investor Service",
      },
      {
        metric: "Small Business Risk",
        trend: "↘️ +200%",
        description: "Small companies 2x more likely to experience incidents",
        source: "Cyentia IRIS Report",
      },
    ],
    mixed: [
      {
        metric: "Zero-Day Exploitation",
        trend: "↕️ +50%",
        description: "More zero-days detected, but faster patching forces their use",
        source: "Google Project Zero",
      },
      {
        metric: "Enterprise vs SMB",
        trend: "↕️ Diverging",
        description: "Large enterprises improving, small businesses deteriorating",
        source: "Cyentia IRIS Report",
      },
    ],
  }
}
