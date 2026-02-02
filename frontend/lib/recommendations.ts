// CAPRI-E Actionable Recommendations
// Threat-level based guidance with NERC CIP compliance mapping

export type ThreatLevel = 'severe' | 'elevated' | 'normal'

export interface Recommendation {
  id: string
  priority: number
  title: string
  description: string
  nercCip: {
    control: string
    name: string
    link: string
  }
  cisaResource: {
    name: string
    link: string
  }
  urgency: 'immediate' | 'within-24h' | 'within-week' | 'routine'
}

export interface ThreatLevelConfig {
  level: ThreatLevel
  label: string
  color: string
  bgColor: string
  borderColor: string
  urgencyMessage: string
  recommendations: Recommendation[]
}

// NERC CIP Control References
const NERC_CIP = {
  'CIP-002': {
    control: 'CIP-002',
    name: 'BES Cyber System Categorization',
    link: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-002-5.1a.pdf'
  },
  'CIP-005': {
    control: 'CIP-005',
    name: 'Electronic Security Perimeters',
    link: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-005-7.pdf'
  },
  'CIP-007': {
    control: 'CIP-007',
    name: 'System Security Management',
    link: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-007-6.pdf'
  },
  'CIP-008': {
    control: 'CIP-008',
    name: 'Incident Reporting & Response',
    link: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-008-6.pdf'
  },
  'CIP-009': {
    control: 'CIP-009',
    name: 'Recovery Plans',
    link: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-009-6.pdf'
  },
  'CIP-010': {
    control: 'CIP-010',
    name: 'Configuration Change Management',
    link: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-010-4.pdf'
  }
}

// CISA Resources
const CISA_RESOURCES = {
  shieldsUp: {
    name: 'CISA Shields Up',
    link: 'https://www.cisa.gov/shields-up'
  },
  icsAdvisories: {
    name: 'ICS-CERT Advisories',
    link: 'https://www.cisa.gov/uscert/ics/advisories'
  },
  incidentResponse: {
    name: 'Incident Response Guide',
    link: 'https://www.cisa.gov/sites/default/files/publications/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf'
  },
  ransomware: {
    name: 'Ransomware Guide',
    link: 'https://www.cisa.gov/stopransomware/ransomware-guide'
  },
  kev: {
    name: 'Known Exploited Vulnerabilities',
    link: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog'
  },
  voltTyphoon: {
    name: 'Volt Typhoon Advisory',
    link: 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a'
  }
}

export const THREAT_LEVELS: Record<ThreatLevel, ThreatLevelConfig> = {
  severe: {
    level: 'severe',
    label: 'SEVERE',
    color: '#d92525',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    urgencyMessage: 'Immediate action required. Active threat to energy sector detected.',
    recommendations: [
      {
        id: 'severe-1',
        priority: 1,
        title: 'Activate Incident Response',
        description: 'Convene your incident response team immediately. Document all actions taken and preserve evidence.',
        nercCip: NERC_CIP['CIP-008'],
        cisaResource: CISA_RESOURCES.incidentResponse,
        urgency: 'immediate'
      },
      {
        id: 'severe-2',
        priority: 2,
        title: 'Isolate Vulnerable Systems',
        description: 'Disconnect any systems with known vulnerabilities from the network. Prioritize OT/ICS systems.',
        nercCip: NERC_CIP['CIP-005'],
        cisaResource: CISA_RESOURCES.shieldsUp,
        urgency: 'immediate'
      },
      {
        id: 'severe-3',
        priority: 3,
        title: 'Disable Remote Access',
        description: 'Temporarily disable or heavily monitor all remote access to critical systems. VPNs, RDP, and vendor connections.',
        nercCip: NERC_CIP['CIP-005'],
        cisaResource: CISA_RESOURCES.icsAdvisories,
        urgency: 'immediate'
      },
      {
        id: 'severe-4',
        priority: 4,
        title: 'Hunt for IOCs',
        description: 'Search logs for known indicators of compromise. Focus on Volt Typhoon and energy-sector APT TTPs.',
        nercCip: NERC_CIP['CIP-007'],
        cisaResource: CISA_RESOURCES.voltTyphoon,
        urgency: 'immediate'
      },
      {
        id: 'severe-5',
        priority: 5,
        title: 'Contact E-ISAC',
        description: 'Report to the Electricity ISAC for threat briefing and coordination with peer utilities.',
        nercCip: NERC_CIP['CIP-008'],
        cisaResource: { name: 'E-ISAC Portal', link: 'https://www.eisac.com/' },
        urgency: 'within-24h'
      }
    ]
  },
  elevated: {
    level: 'elevated',
    label: 'ELEVATED',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    urgencyMessage: 'Enhanced vigilance recommended. Increased threat activity detected.',
    recommendations: [
      {
        id: 'elevated-1',
        priority: 1,
        title: 'Review Network Segmentation',
        description: 'Verify ICS/OT networks are properly isolated from IT networks. Check firewall rules and ACLs.',
        nercCip: NERC_CIP['CIP-005'],
        cisaResource: CISA_RESOURCES.shieldsUp,
        urgency: 'within-24h'
      },
      {
        id: 'elevated-2',
        priority: 2,
        title: 'Validate Backup Systems',
        description: 'Confirm offline backups exist for all critical systems. Test restoration procedures.',
        nercCip: NERC_CIP['CIP-009'],
        cisaResource: CISA_RESOURCES.ransomware,
        urgency: 'within-24h'
      },
      {
        id: 'elevated-3',
        priority: 3,
        title: 'Patch KEV Vulnerabilities',
        description: 'Apply patches for all Known Exploited Vulnerabilities within 48 hours. Prioritize internet-facing systems.',
        nercCip: NERC_CIP['CIP-007'],
        cisaResource: CISA_RESOURCES.kev,
        urgency: 'within-24h'
      },
      {
        id: 'elevated-4',
        priority: 4,
        title: 'Increase Log Monitoring',
        description: 'Enhance monitoring of authentication logs, firewall logs, and ICS/SCADA event logs.',
        nercCip: NERC_CIP['CIP-007'],
        cisaResource: CISA_RESOURCES.icsAdvisories,
        urgency: 'within-24h'
      }
    ]
  },
  normal: {
    level: 'normal',
    label: 'NORMAL',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    urgencyMessage: 'Baseline threat levels. Maintain standard security posture.',
    recommendations: [
      {
        id: 'normal-1',
        priority: 1,
        title: 'Continue Routine Monitoring',
        description: 'Maintain normal security operations. Review daily alerts and logs.',
        nercCip: NERC_CIP['CIP-007'],
        cisaResource: CISA_RESOURCES.icsAdvisories,
        urgency: 'routine'
      },
      {
        id: 'normal-2',
        priority: 2,
        title: 'Review Patch Schedule',
        description: 'Plan upcoming patch deployments. Ensure test environments are ready.',
        nercCip: NERC_CIP['CIP-007'],
        cisaResource: CISA_RESOURCES.kev,
        urgency: 'within-week'
      },
      {
        id: 'normal-3',
        priority: 3,
        title: 'Conduct Tabletop Exercise',
        description: 'Schedule a tabletop exercise to test incident response procedures.',
        nercCip: NERC_CIP['CIP-008'],
        cisaResource: CISA_RESOURCES.incidentResponse,
        urgency: 'within-week'
      },
      {
        id: 'normal-4',
        priority: 4,
        title: 'Update Asset Inventory',
        description: 'Review and update your BES Cyber Asset inventory. Verify categorizations.',
        nercCip: NERC_CIP['CIP-002'],
        cisaResource: CISA_RESOURCES.shieldsUp,
        urgency: 'within-week'
      }
    ]
  }
}

export function getThreatLevel(score: number): ThreatLevel {
  if (score <= 2.0) return 'severe'
  if (score <= 3.0) return 'elevated'
  return 'normal'
}

export function getRecommendations(score: number): ThreatLevelConfig {
  const level = getThreatLevel(score)
  return THREAT_LEVELS[level]
}

export function getUrgencyLabel(urgency: Recommendation['urgency']): string {
  const labels: Record<Recommendation['urgency'], string> = {
    'immediate': 'Act Now',
    'within-24h': 'Within 24 Hours',
    'within-week': 'This Week',
    'routine': 'Ongoing'
  }
  return labels[urgency]
}

export function getUrgencyColor(urgency: Recommendation['urgency']): string {
  const colors: Record<Recommendation['urgency'], string> = {
    'immediate': '#dc2626',
    'within-24h': '#ea580c',
    'within-week': '#ca8a04',
    'routine': '#16a34a'
  }
  return colors[urgency]
}
