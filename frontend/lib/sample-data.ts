import type { Alert } from "@/types/alert"

// Generate realistic sample alerts for analytics
export function generateSampleAlerts(): Alert[] {
  const sampleAlerts: Alert[] = [
    // Recent High-Priority Alerts
    {
      id: "aa24-001a",
      title: "Critical Vulnerability in Industrial Control Systems",
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      posture: "Shields Up",
      sector: "Energy",
      urgency: "High",
      kev: true,
      exploitation: true,
      criticalInfrastructure: true,
      summary:
        "CISA has identified active exploitation of a critical vulnerability (CVE-2024-0001) in Schneider Electric industrial control systems used across energy sector facilities.",
      url: "https://www.cisa.gov/news-events/alerts/2024/01/15/critical-vulnerability-industrial-control-systems",
      source: "CISA",
    },
    {
      id: "aa24-002a",
      title: "Ransomware Campaign Targeting Healthcare Networks",
      date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      posture: "Shields Up",
      sector: "Healthcare",
      urgency: "High",
      kev: false,
      exploitation: true,
      criticalInfrastructure: true,
      summary:
        "Multiple healthcare organizations report ransomware infections affecting patient care systems. Threat actors exploiting unpatched VPN vulnerabilities.",
      url: "https://www.cisa.gov/news-events/alerts/2024/01/15/ransomware-campaign-targeting-healthcare",
      source: "CISA",
    },
    {
      id: "aa24-003a",
      title: "Supply Chain Compromise in Financial Software",
      date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      posture: "Shields Ready",
      sector: "Finance",
      urgency: "High",
      kev: true,
      exploitation: false,
      criticalInfrastructure: true,
      summary:
        "Nation-state actors have compromised a widely-used financial software package, potentially affecting hundreds of financial institutions.",
      url: "https://www.cisa.gov/news-events/alerts/2024/01/15/supply-chain-compromise-financial-software",
      source: "CISA",
    },

    // Medium Priority Alerts
    {
      id: "aa24-004a",
      title: "Phishing Campaign Targeting Transportation Sector",
      date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      posture: "Shields Ready",
      sector: "Transportation",
      urgency: "Medium",
      kev: false,
      exploitation: false,
      criticalInfrastructure: true,
      summary:
        "Sophisticated phishing emails targeting transportation sector employees with malicious attachments designed to steal credentials.",
      url: "https://www.cisa.gov/news-events/alerts/2024/01/15/phishing-campaign-transportation",
      source: "CISA",
    },
    {
      id: "aa24-005a",
      title: "Water Treatment Facility Security Advisory",
      date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      posture: "Shields Ready",
      sector: "Water",
      urgency: "Medium",
      kev: false,
      exploitation: false,
      criticalInfrastructure: true,
      summary:
        "Security researchers have identified vulnerabilities in HMI software commonly used in water treatment facilities.",
      url: "https://www.cisa.gov/news-events/alerts/2024/01/14/water-treatment-security-advisory",
      source: "CISA",
    },
  ]

  return sampleAlerts
}

// Generate historical trend data for analytics
export function generateHistoricalData(days = 30) {
  const data = []
  const sectors = [
    "Energy",
    "Healthcare",
    "Finance",
    "Transportation",
    "Water",
    "Communications",
    "Defense",
    "Manufacturing",
    "Food & Agriculture",
  ]

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    // Simulate realistic CAPRI score fluctuations
    const baseScore = 2.8
    const seasonalVariation = Math.sin((i / days) * Math.PI * 2) * 0.3
    const randomVariation = (Math.random() - 0.5) * 0.4
    const trendFactor = ((days - i) / days) * 0.2 // Slight upward trend

    const score = Math.max(1, Math.min(5, baseScore + seasonalVariation + randomVariation + trendFactor))

    // Generate alert counts with realistic patterns
    const baseAlerts = 8
    const weekendFactor = [0, 6].includes(date.getDay()) ? 0.6 : 1.0 // Fewer alerts on weekends
    const alertCount = Math.floor(baseAlerts * weekendFactor * (0.8 + Math.random() * 0.4))

    data.push({
      date: date.toISOString().split("T")[0],
      score: Number(score.toFixed(2)),
      alerts: alertCount,
      sectors: sectors.reduce(
        (acc, sector) => {
          acc[sector] = {
            score: Math.max(1, Math.min(5, score + (Math.random() - 0.5) * 0.6)),
            alerts: Math.floor(alertCount * (0.1 + Math.random() * 0.2)),
          }
          return acc
        },
        {} as Record<string, { score: number; alerts: number }>,
      ),
    })
  }

  return data
}

// Generate threat intelligence predictions
export function generateThreatPredictions() {
  return [
    {
      id: "pred-001",
      type: "sector-targeting",
      sector: "Energy",
      confidence: 87,
      timeframe: "7 days",
      severity: "high",
      title: "Increased Energy Sector Targeting Predicted",
      description:
        "AI analysis of threat actor communications and infrastructure scanning patterns indicates a 40% increase in targeting of energy sector organizations over the next 7 days.",
      indicators: [
        "Increased reconnaissance activity against energy sector domains",
        "Threat actor forum discussions mentioning energy infrastructure",
        "Spike in energy-related vulnerability research",
      ],
      recommendations: [
        "Implement enhanced monitoring for energy sector organizations",
        "Review and update incident response procedures",
        "Coordinate with energy sector stakeholders",
      ],
    },
    {
      id: "pred-002",
      type: "attack-vector",
      sector: "Healthcare",
      confidence: 73,
      timeframe: "3-5 days",
      severity: "medium",
      title: "Healthcare Phishing Campaign Anticipated",
      description:
        "Pattern analysis suggests healthcare sector will face increased phishing campaigns targeting COVID-19 response systems and patient data.",
      indicators: [
        "Registration of healthcare-themed malicious domains",
        "Increased phishing kit development activity",
        "Social engineering content targeting healthcare workers",
      ],
      recommendations: [
        "Enhance email security filtering",
        "Conduct targeted security awareness training",
        "Monitor for suspicious domain registrations",
      ],
    },
    {
      id: "pred-003",
      type: "vulnerability-exploitation",
      sector: "Finance",
      confidence: 91,
      timeframe: "24-48 hours",
      severity: "high",
      title: "Zero-Day Exploitation Imminent",
      description:
        "Intelligence indicates threat actors have developed exploits for recently disclosed financial software vulnerabilities and plan to deploy within 48 hours.",
      indicators: [
        "Exploit code development observed in underground forums",
        "Targeting lists containing financial institutions identified",
        "Command and control infrastructure being prepared",
      ],
      recommendations: [
        "Emergency patching of affected financial software",
        "Implement network segmentation controls",
        "Activate incident response teams",
      ],
    },
    {
      id: "pred-004",
      type: "supply-chain",
      sector: "Manufacturing",
      confidence: 65,
      timeframe: "14 days",
      severity: "medium",
      title: "Manufacturing Supply Chain Risk Elevated",
      description:
        "Analysis of supply chain vulnerabilities and threat actor capabilities suggests increased risk to manufacturing sector through third-party compromises.",
      indicators: [
        "Increased targeting of manufacturing software vendors",
        "Supply chain mapping activities by threat actors",
        "Vulnerabilities in widely-used manufacturing tools",
      ],
      recommendations: [
        "Audit third-party vendor security practices",
        "Implement supply chain risk management protocols",
        "Enhance monitoring of vendor connections",
      ],
    },
  ]
}
