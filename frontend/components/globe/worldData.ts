import * as THREE from 'three'

export interface GeoPoint {
  lat: number
  lng: number
  name?: string
  region?: string
}

export type Sector = 'nuclear' | 'hydro' | 'grid' | 'natural_gas' | 'oil' | 'water'

export interface EnergyFacility {
  id: string
  lat: number
  lng: number
  name: string
  sector: Sector
  operator: string
  capacity?: string
  status?: 'active' | 'construction' | 'planned' | 'decommissioned'
}

export interface MitreTTP {
  id: string        // e.g., 'T1190' or 'T1059.001'
  name: string      // e.g., 'Exploit Public-Facing Application'
  tactic: string    // e.g., 'Initial Access'
}

export interface ThreatActor {
  name: string
  aliases?: string[]
  mitreId?: string           // e.g., 'G0007'
  mitrePage?: string         // URL to MITRE ATT&CK group page
  ttps?: MitreTTP[]
  origin: GeoPoint
  country: string
  type: string
  color: string
  targetSectors: Sector[]
  description: string
}

export interface FacilityRisk {
  score: number              // 1-5 scale (1=severe, 5=normal, matching CAPRI convention)
  label: string              // 'Critical' | 'High' | 'Elevated' | 'Guarded' | 'Low'
  color: string              // CSS color for display
  actorCount: number         // Threat actors targeting this sector
  actorNames: string[]       // Names of targeting actors
  relevantCveCount: number   // CVEs matching this sector
  relevantKevCount: number   // KEVs matching this sector
  overdueKevCount: number    // Overdue KEVs
  ransomwareKevCount: number // KEVs with known ransomware use
  factors: string[]          // Human-readable risk factors
  // Transparent sub-scores for auditable breakdown
  actorScore: number         // Raw actor sub-score (0-4)
  cveScore: number           // Raw CVE sub-score (0-3)
  kevScore: number           // Raw KEV sub-score (0-3)
  rawTotal: number           // Sum of sub-scores before inversion (0-10)
}

// Calculate risk score for a single facility based on real threat data
export function calculateFacilityRisk(
  facility: EnergyFacility,
  threatItems: any[],
  kevItems: any[],
): FacilityRisk {
  const sector = facility.sector
  const keywords = sectorKeywords[sector]

  // 1. Threat actor assessment (0-4 points)
  // Each targeting actor adds weight; more actors = higher risk
  const targetingActors = threatActors.filter((a) =>
    a.targetSectors.includes(sector)
  )
  const actorCount = targetingActors.length
  // Weighted: nation-state APTs with ICS focus are more dangerous
  const actorScore = Math.min(actorCount * 0.5, 4)

  // 2. CVE exposure (0-3 points)
  // Sector-relevant CVEs from the threat feed
  const relevantCves = threatItems.filter((item) => {
    const text = `${item.title || ''} ${item.description || ''} ${item.shortDescription || ''}`.toLowerCase()
    return keywords.some((kw) => text.includes(kw.toLowerCase()))
  })
  const relevantCveCount = relevantCves.length
  // More CVEs = higher exposure, diminishing returns
  const cveScore = Math.min(relevantCveCount * 0.15, 3)

  // 3. KEV urgency (0-3 points)
  // Known Exploited Vulnerabilities are actively weaponized
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const relevantKevs = kevItems.filter((kev) => {
    const text = `${kev.vendorProject || ''} ${kev.product || ''} ${kev.shortDescription || ''}`.toLowerCase()
    return keywords.some((kw) => text.includes(kw.toLowerCase()))
  })
  const relevantKevCount = relevantKevs.length
  const overdueKevs = relevantKevs.filter((kev) => new Date(kev.dueDate) < today)
  const overdueKevCount = overdueKevs.length
  const ransomwareKevs = relevantKevs.filter((kev) => kev.knownRansomwareCampaignUse === 'Known')
  const ransomwareKevCount = ransomwareKevs.length

  let kevScore = Math.min(relevantKevCount * 0.4, 1.5)
  kevScore += Math.min(overdueKevCount * 0.5, 1.0)  // Overdue KEVs are urgent
  kevScore += Math.min(ransomwareKevCount * 0.3, 0.5) // Ransomware association
  kevScore = Math.min(kevScore, 3)

  // Raw threat intensity (0-10)
  const rawScore = actorScore + cveScore + kevScore

  // Invert to 1-5 scale matching CAPRI convention: 1 = Severe, 5 = Normal
  // Higher raw threat = lower score number
  const inverted = 5 - (rawScore / 10) * 4
  const score = Math.max(Math.min(Math.round(inverted * 10) / 10, 5), 1)

  // Build human-readable risk factors
  const factors: string[] = []
  if (actorCount > 0) {
    factors.push(`${actorCount} nation-state threat actor${actorCount > 1 ? 's' : ''} target${actorCount === 1 ? 's' : ''} this sector`)
  }
  if (relevantCveCount > 0) {
    factors.push(`${relevantCveCount} sector-relevant CVE${relevantCveCount > 1 ? 's' : ''} in current feed`)
  }
  if (overdueKevCount > 0) {
    factors.push(`${overdueKevCount} overdue KEV${overdueKevCount > 1 ? 's' : ''} requiring immediate remediation`)
  }
  if (ransomwareKevCount > 0) {
    factors.push(`${ransomwareKevCount} KEV${ransomwareKevCount > 1 ? 's' : ''} with known ransomware exploitation`)
  }
  if (relevantKevCount > 0 && overdueKevCount === 0) {
    factors.push(`${relevantKevCount} active KEV${relevantKevCount > 1 ? 's' : ''} under remediation deadline`)
  }
  if (factors.length === 0) {
    factors.push('No specific sector threats detected in current intelligence')
  }

  // Label and color based on score (1 = worst, 5 = best, matching CAPRI scale)
  let label: string
  let color: string
  if (score <= 1.5) {
    label = 'Severe'
    color = '#ef4444'
  } else if (score <= 2.5) {
    label = 'High'
    color = '#f97316'
  } else if (score <= 3.5) {
    label = 'Elevated'
    color = '#eab308'
  } else if (score <= 4.5) {
    label = 'Guarded'
    color = '#3b82f6'
  } else {
    label = 'Low'
    color = '#22c55e'
  }

  return {
    score,
    label,
    color,
    actorCount,
    actorNames: targetingActors.map((a) => a.name),
    relevantCveCount,
    relevantKevCount,
    overdueKevCount,
    ransomwareKevCount,
    factors,
    actorScore,
    cveScore,
    kevScore,
    rawTotal: rawScore,
  }
}

// Convert lat/lng to Three.js Vector3 on a sphere
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Create a curved arc between two points on the globe
export function createArcCurve(
  source: GeoPoint,
  target: GeoPoint | EnergyFacility,
  radius: number,
  elevation: number = 0.25
): THREE.QuadraticBezierCurve3 {
  const start = latLngToVector3(source.lat, source.lng, radius)
  const end = latLngToVector3(target.lat, target.lng, radius)
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dist = start.distanceTo(end)
  mid.normalize().multiplyScalar(radius + elevation + dist * 0.15)
  return new THREE.QuadraticBezierCurve3(start, mid, end)
}

// Sector display colors for globe markers
export const sectorColors: Record<Sector, string> = {
  nuclear: '#f59e0b',
  hydro: '#3b82f6',
  grid: '#22c55e',
  natural_gas: '#f97316',
  oil: '#ef4444',
  water: '#06b6d4',
}

export const sectorLabels: Record<Sector, string> = {
  nuclear: 'Nuclear',
  hydro: 'Hydroelectric',
  grid: 'Grid Operations',
  natural_gas: 'Natural Gas',
  oil: 'Oil & Petroleum',
  water: 'Water Systems',
}

// Keywords used to match CVEs/KEVs/alerts to sectors
export const sectorKeywords: Record<Sector, string[]> = {
  nuclear: ['nuclear', 'NRC', 'reactor', 'radiation', 'fuel rod', 'containment', 'IAEA', 'enrichment', 'centrifuge', 'Stuxnet', 'nuclear plant', 'nuclear power', 'uranium', 'spent fuel', 'BWR', 'PWR', 'fission'],
  hydro: ['hydroelectric', 'dam', 'reservoir', 'spillway', 'hydropower', 'water turbine', 'FERC', 'flood control', 'penstock', 'hydro plant', 'pumped storage'],
  grid: ['power grid', 'SCADA', 'ICS', 'substation', 'transformer', 'transmission', 'NERC', 'CIP', 'EMS', 'DCS', 'RTU', 'PLC', 'HMI', 'smart grid', 'AMI', 'DERMS', 'Modbus', 'DNP3', 'IEC 61850', 'OT', 'industrial control', 'Industroyer', 'BlackEnergy', 'energy grid', 'electric grid', 'power system', 'operational technology', 'OPC UA', 'OPC', 'BACnet', 'IEC 104', 'IEC 60870', 'Profinet', 'EtherNet/IP', 'Siemens', 'Schneider Electric', 'ABB', 'Honeywell', 'Emerson', 'Rockwell', 'GE Vernova', 'Yokogawa', 'Hitachi Energy', 'CrashOverride', 'Industroyer2', 'Havex', 'Pipedream', 'Incontroller', 'FrostyGoop', 'CosmicEnergy', 'Triton'],
  natural_gas: ['natural gas', 'LNG', 'pipeline', 'compressor station', 'gas turbine', 'methane', 'PHMSA', 'gas distribution', 'gas pipeline', 'liquefied natural gas', 'regasification', 'liquefaction', 'Colonial Pipeline'],
  oil: ['oil', 'petroleum', 'refinery', 'crude', 'strategic petroleum', 'SPR', 'petrochemical', 'distillation', 'oil pipeline', 'oil refinery', 'Shamoon', 'Triton', 'TRISIS'],
  water: ['water treatment', 'water utility', 'wastewater', 'drinking water', 'chlorination', 'water system', 'water infrastructure', 'water plant', 'sewage', 'water purification', 'Unitronics', 'Vision PLC'],
}

// Known threat actor origins with targeting data and MITRE ATT&CK TTPs
// TTPs sourced from attack.mitre.org group pages unless otherwise noted
export const threatActors: ThreatActor[] = [
  {
    name: 'Volt Typhoon',
    aliases: ['BRONZE SILHOUETTE', 'Vanguard Panda', 'DEV-0391', 'Insidious Taurus', 'UNC3236'],
    mitreId: 'G1017',
    mitrePage: 'https://attack.mitre.org/groups/G1017/',
    ttps: [
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1078.002', name: 'Valid Accounts: Domain Accounts', tactic: 'Persistence' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1003.003', name: 'OS Credential Dumping: NTDS', tactic: 'Credential Access' },
      { id: 'T1505.003', name: 'Web Shell', tactic: 'Persistence' },
      { id: 'T1090.001', name: 'Proxy: Internal Proxy', tactic: 'Command and Control' },
      { id: 'T1562.001', name: 'Impair Defenses: Disable or Modify Tools', tactic: 'Defense Evasion' },
      { id: 'T1047', name: 'Windows Management Instrumentation', tactic: 'Execution' },
      { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
    ],
    origin: { lat: 39.9, lng: 116.4, name: 'Beijing' },
    country: 'China',
    type: 'APT',
    color: '#ff3333',
    targetSectors: ['grid', 'water', 'natural_gas', 'hydro'],
    description: 'Chinese state-sponsored group focused on pre-positioning within US critical infrastructure for potential disruption. Known for living-off-the-land techniques targeting grid operations, water systems, and communications infrastructure.',
  },
  {
    name: 'APT41',
    aliases: ['Winnti', 'BARIUM', 'Wicked Panda', 'Brass Typhoon', 'Double Dragon'],
    mitreId: 'G0096',
    mitrePage: 'https://attack.mitre.org/groups/G0096/',
    ttps: [
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1195.002', name: 'Supply Chain Compromise: Software Supply Chain', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1574.001', name: 'DLL Search Order Hijacking', tactic: 'Persistence' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1505.003', name: 'Web Shell', tactic: 'Persistence' },
      { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion' },
      { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
      { id: 'T1553.002', name: 'Subvert Trust Controls: Code Signing', tactic: 'Defense Evasion' },
      { id: 'T1003.003', name: 'OS Credential Dumping: NTDS', tactic: 'Credential Access' },
    ],
    origin: { lat: 30.57, lng: 104.07, name: 'Chengdu' },
    country: 'China',
    type: 'APT',
    color: '#ff3333',
    targetSectors: ['grid', 'oil', 'natural_gas'],
    description: 'Chinese state-sponsored dual espionage and financially motivated group based in Chengdu (Chengdu 404 Network Technology). Targets energy, telecommunications, and technology sectors with supply chain compromises.',
  },
  {
    name: 'Sandworm',
    aliases: ['Voodoo Bear', 'IRIDIUM', 'Seashell Blizzard', 'ELECTRUM', 'Telebots'],
    mitreId: 'G0034',
    mitrePage: 'https://attack.mitre.org/groups/G0034/',
    ttps: [
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1485', name: 'Data Destruction', tactic: 'Impact' },
      { id: 'T1561.002', name: 'Disk Wipe: Disk Structure Wipe', tactic: 'Impact' },
      { id: 'T1489', name: 'Service Stop', tactic: 'Impact' },
      { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact' },
      { id: 'T1505.003', name: 'Web Shell', tactic: 'Persistence' },
      { id: 'T1195.002', name: 'Supply Chain Compromise: Software Supply Chain', tactic: 'Initial Access' },
      { id: 'T1484.001', name: 'Group Policy Modification', tactic: 'Defense Evasion' },
    ],
    origin: { lat: 55.8, lng: 37.6, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (GRU Unit 74455)',
    color: '#ff4444',
    targetSectors: ['grid', 'nuclear', 'oil', 'natural_gas', 'hydro'],
    description: 'Russian GRU-linked group responsible for BlackEnergy and Industroyer attacks on Ukrainian power grid. Capable of destructive attacks against energy infrastructure including oil/gas and industrial control systems.',
  },
  {
    name: 'APT28',
    aliases: ['Fancy Bear', 'STRONTIUM', 'Forest Blizzard', 'Sofacy', 'Pawn Storm'],
    mitreId: 'G0007',
    mitrePage: 'https://attack.mitre.org/groups/G0007/',
    ttps: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1203', name: 'Exploitation for Client Execution', tactic: 'Execution' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1110.003', name: 'Brute Force: Password Spraying', tactic: 'Credential Access' },
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation' },
      { id: 'T1114.002', name: 'Remote Email Collection', tactic: 'Collection' },
      { id: 'T1090.002', name: 'Proxy: External Proxy', tactic: 'Command and Control' },
      { id: 'T1048.002', name: 'Exfiltration Over Asymmetric Encrypted Non-C2', tactic: 'Exfiltration' },
    ],
    origin: { lat: 55.8, lng: 37.6, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (GRU Unit 26165)',
    color: '#ff4444',
    targetSectors: ['grid', 'nuclear', 'oil'],
    description: 'Russian military intelligence group targeting government and energy sectors. Known for spearphishing campaigns and exploitation of network infrastructure devices.',
  },
  {
    name: 'APT29',
    aliases: ['Cozy Bear', 'NOBELIUM', 'Midnight Blizzard', 'The Dukes', 'Dark Halo'],
    mitreId: 'G0016',
    mitrePage: 'https://attack.mitre.org/groups/G0016/',
    ttps: [
      { id: 'T1195.002', name: 'Supply Chain Compromise: Software Supply Chain', tactic: 'Initial Access' },
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1606.002', name: 'Forge Web Credentials: SAML Tokens', tactic: 'Credential Access' },
      { id: 'T1098.001', name: 'Account Manipulation: Additional Cloud Credentials', tactic: 'Persistence' },
      { id: 'T1484.002', name: 'Domain Policy Modification: Trust Modification', tactic: 'Defense Evasion' },
      { id: 'T1003.006', name: 'OS Credential Dumping: DCSync', tactic: 'Credential Access' },
      { id: 'T1090.004', name: 'Proxy: Domain Fronting', tactic: 'Command and Control' },
      { id: 'T1027.006', name: 'HTML Smuggling', tactic: 'Defense Evasion' },
      { id: 'T1621', name: 'Multi-Factor Authentication Request Generation', tactic: 'Credential Access' },
    ],
    origin: { lat: 55.8, lng: 37.6, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (SVR)',
    color: '#ff6644',
    targetSectors: ['grid', 'nuclear'],
    description: 'Russian SVR foreign intelligence group. Conducted SolarWinds supply chain attack. Targets government networks and critical infrastructure for intelligence collection.',
  },
  {
    name: 'Lazarus',
    aliases: ['HIDDEN COBRA', 'Zinc', 'Diamond Sleet', 'Labyrinth Chollima'],
    mitreId: 'G0032',
    mitrePage: 'https://attack.mitre.org/groups/G0032/',
    ttps: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1566.003', name: 'Spearphishing via Service', tactic: 'Initial Access' },
      { id: 'T1189', name: 'Drive-by Compromise', tactic: 'Initial Access' },
      { id: 'T1203', name: 'Exploitation for Client Execution', tactic: 'Execution' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1485', name: 'Data Destruction', tactic: 'Impact' },
      { id: 'T1561.002', name: 'Disk Wipe: Disk Structure Wipe', tactic: 'Impact' },
      { id: 'T1218.011', name: 'Rundll32', tactic: 'Defense Evasion' },
      { id: 'T1055.001', name: 'DLL Injection', tactic: 'Defense Evasion' },
      { id: 'T1574.001', name: 'DLL Search Order Hijacking', tactic: 'Persistence' },
    ],
    origin: { lat: 39.0, lng: 125.8, name: 'Pyongyang' },
    country: 'North Korea',
    type: 'APT',
    color: '#ff2222',
    targetSectors: ['grid', 'nuclear', 'oil'],
    description: 'North Korean state-sponsored group conducting espionage and financially motivated attacks. Targets energy and defense sectors with destructive malware capabilities. Documented campaigns against energy providers including oil/gas (2022).',
  },
  {
    name: 'APT33',
    aliases: ['Elfin', 'Refined Kitten', 'MAGNALLIUM', 'Peach Sandstorm', 'HOLMIUM'],
    mitreId: 'G0064',
    mitrePage: 'https://attack.mitre.org/groups/G0064/',
    ttps: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1110.003', name: 'Brute Force: Password Spraying', tactic: 'Credential Access' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation' },
      { id: 'T1053.005', name: 'Scheduled Task', tactic: 'Persistence' },
      { id: 'T1078', name: 'Valid Accounts', tactic: 'Persistence' },
      { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
      { id: 'T1204.002', name: 'User Execution: Malicious File', tactic: 'Execution' },
    ],
    origin: { lat: 35.7, lng: 51.4, name: 'Tehran' },
    country: 'Iran',
    type: 'APT',
    color: '#ff6600',
    targetSectors: ['oil', 'natural_gas'],
    description: 'Iranian state-sponsored group (Elfin/Refined Kitten) targeting oil, gas, and petrochemical sectors. Associated with destructive wiper malware campaigns including Shamoon variants.',
  },
  {
    name: 'APT35',
    aliases: ['Charming Kitten', 'PHOSPHORUS', 'Mint Sandstorm', 'Magic Hound', 'TA453'],
    mitreId: 'G0059',
    mitrePage: 'https://attack.mitre.org/groups/G0059/',
    ttps: [
      { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1505.003', name: 'Web Shell', tactic: 'Persistence' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
      { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
      { id: 'T1078.002', name: 'Valid Accounts: Domain Accounts', tactic: 'Persistence' },
      { id: 'T1562.001', name: 'Impair Defenses: Disable or Modify Tools', tactic: 'Defense Evasion' },
      { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement' },
    ],
    origin: { lat: 35.7, lng: 51.4, name: 'Tehran' },
    country: 'Iran',
    type: 'APT',
    color: '#ff6600',
    targetSectors: ['nuclear', 'oil'],
    description: 'Iranian state-sponsored group (Charming Kitten/Magic Hound) conducting espionage against nuclear energy and oil sectors. Uses social engineering and credential harvesting for initial access.',
  },
  {
    name: 'Turla',
    aliases: ['Snake', 'Uroburos', 'Venomous Bear', 'KRYPTON', 'Secret Blizzard', 'Waterbug'],
    mitreId: 'G0010',
    mitrePage: 'https://attack.mitre.org/groups/G0010/',
    ttps: [
      { id: 'T1189', name: 'Drive-by Compromise', tactic: 'Initial Access' },
      { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1055.001', name: 'DLL Injection', tactic: 'Defense Evasion' },
      { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
      { id: 'T1071.003', name: 'Application Layer Protocol: Mail Protocols', tactic: 'Command and Control' },
      { id: 'T1005', name: 'Data from Local System', tactic: 'Collection' },
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation' },
      { id: 'T1102.002', name: 'Web Service: Bidirectional Communication', tactic: 'Command and Control' },
      { id: 'T1027.011', name: 'Fileless Storage', tactic: 'Defense Evasion' },
    ],
    origin: { lat: 54.63, lng: 39.69, name: 'Ryazan' },
    country: 'Russia',
    type: 'APT (FSB Center 16)',
    color: '#ff5533',
    targetSectors: ['grid', 'nuclear'],
    description: 'Russian FSB Center 16 group operating from Ryazan. Highly sophisticated espionage capabilities targeting government and critical infrastructure networks using satellite-based C2 and custom implants (Snake/Uroburos).',
  },
  {
    name: 'Kimsuky',
    aliases: ['Velvet Chollima', 'THALLIUM', 'Emerald Sleet', 'Black Banshee', 'APT43'],
    mitreId: 'G0094',
    mitrePage: 'https://attack.mitre.org/groups/G0094/',
    ttps: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1059.007', name: 'JavaScript', tactic: 'Execution' },
      { id: 'T1056.001', name: 'Keylogging', tactic: 'Collection' },
      { id: 'T1176.001', name: 'Browser Extensions', tactic: 'Persistence' },
      { id: 'T1114.003', name: 'Email Forwarding Rule', tactic: 'Collection' },
      { id: 'T1218.005', name: 'Mshta', tactic: 'Defense Evasion' },
      { id: 'T1598.003', name: 'Phishing for Information: Spearphishing Link', tactic: 'Reconnaissance' },
      { id: 'T1555.003', name: 'Credentials from Web Browsers', tactic: 'Credential Access' },
    ],
    origin: { lat: 39.0, lng: 125.8, name: 'Pyongyang' },
    country: 'North Korea',
    type: 'APT',
    color: '#ff3333',
    targetSectors: ['nuclear', 'grid'],
    description: 'North Korean intelligence group targeting nuclear energy research and grid operations. Conducts espionage through spearphishing and watering hole attacks against energy sector personnel.',
  },
  {
    name: 'Dragonfly',
    aliases: ['Energetic Bear', 'Berserk Bear', 'Crouching Yeti', 'IRON LIBERTY', 'Ghost Blizzard', 'DYMALLOY'],
    mitreId: 'G0035',
    mitrePage: 'https://attack.mitre.org/groups/G0035/',
    ttps: [
      { id: 'T1189', name: 'Drive-by Compromise', tactic: 'Initial Access' },
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1195.002', name: 'Supply Chain Compromise: Software Supply Chain', tactic: 'Initial Access' },
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1187', name: 'Forced Authentication', tactic: 'Credential Access' },
      { id: 'T1003.003', name: 'OS Credential Dumping: NTDS', tactic: 'Credential Access' },
      { id: 'T1505.003', name: 'Web Shell', tactic: 'Persistence' },
      { id: 'T1210', name: 'Exploitation of Remote Services', tactic: 'Lateral Movement' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1133', name: 'External Remote Services', tactic: 'Persistence' },
    ],
    origin: { lat: 55.75, lng: 37.62, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (FSB Center 16)',
    color: '#ff4444',
    targetSectors: ['grid', 'oil', 'natural_gas', 'nuclear'],
    description: 'Russian FSB-linked group (Energetic Bear/Berserk Bear) with primary focus on energy sector since 2013. Deployed Havex malware against US/European energy utilities. CISA AA20-296A documents compromises of US government and energy networks.',
  },
  {
    name: 'APT34',
    aliases: ['OilRig', 'Helix Kitten', 'COBALT GYPSY', 'Hazel Sandstorm', 'Crambus', 'Earth Simnavaz'],
    mitreId: 'G0049',
    mitrePage: 'https://attack.mitre.org/groups/G0049/',
    ttps: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1071.004', name: 'Application Layer Protocol: DNS', tactic: 'Command and Control' },
      { id: 'T1505.003', name: 'Web Shell', tactic: 'Persistence' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1053.005', name: 'Scheduled Task', tactic: 'Persistence' },
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation' },
      { id: 'T1056.001', name: 'Keylogging', tactic: 'Collection' },
      { id: 'T1572', name: 'Protocol Tunneling', tactic: 'Command and Control' },
    ],
    origin: { lat: 35.70, lng: 51.42, name: 'Tehran' },
    country: 'Iran',
    type: 'APT (MOIS)',
    color: '#ff6600',
    targetSectors: ['oil', 'natural_gas', 'grid'],
    description: 'Iranian MOIS-affiliated group (OilRig/Helix Kitten) conducting sustained campaigns against energy companies globally. Active 2024-2025 campaigns targeting energy and defense sectors using compromised credentials and supply chain access.',
  },
  {
    name: 'CyberAv3ngers',
    aliases: ['Cyber Av3ngers', 'Soldiers of Solomon'],
    mitreId: 'G1027',
    mitrePage: 'https://attack.mitre.org/groups/G1027/',
    ttps: [
      // ICS-domain techniques from MITRE ATT&CK G1027
      { id: 'T0812', name: 'Default Credentials', tactic: 'Initial Access (ICS)' },
      { id: 'T0883', name: 'Internet Accessible Device', tactic: 'Initial Access (ICS)' },
      { id: 'T0814', name: 'Denial of Service', tactic: 'Impact (ICS)' },
      { id: 'T0826', name: 'Loss of Availability', tactic: 'Impact (ICS)' },
      { id: 'T0828', name: 'Loss of Productivity and Revenue', tactic: 'Impact (ICS)' },
      { id: 'T0829', name: 'Loss of View', tactic: 'Impact (ICS)' },
      // Enterprise-domain techniques from CISA AA23-335A
      { id: 'T1078.001', name: 'Default Accounts', tactic: 'Initial Access' },
      { id: 'T1110', name: 'Brute Force', tactic: 'Credential Access' },
      { id: 'T1491.001', name: 'Internal Defacement', tactic: 'Impact' },
    ],
    origin: { lat: 35.70, lng: 51.42, name: 'Tehran' },
    country: 'Iran',
    type: 'APT (IRGC)',
    color: '#ff7700',
    targetSectors: ['water', 'grid'],
    description: 'IRGC-affiliated group that compromised 75+ Unitronics PLCs in US water/wastewater systems (Nov 2023-Jan 2024). US Treasury sanctioned 6 IRGC officials in Feb 2024. Targets industrial control systems in water infrastructure.',
  },
  {
    name: 'MuddyWater',
    aliases: ['MERCURY', 'Static Kitten', 'Seedworm', 'Mango Sandstorm', 'TA450', 'Earth Vetala'],
    mitreId: 'G0069',
    mitrePage: 'https://attack.mitre.org/groups/G0069/',
    ttps: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1059.005', name: 'Visual Basic', tactic: 'Execution' },
      { id: 'T1204.002', name: 'User Execution: Malicious File', tactic: 'Execution' },
      { id: 'T1027.010', name: 'Command Obfuscation', tactic: 'Defense Evasion' },
      { id: 'T1218.005', name: 'Mshta', tactic: 'Defense Evasion' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
      { id: 'T1219', name: 'Remote Access Tools', tactic: 'Command and Control' },
    ],
    origin: { lat: 35.70, lng: 51.42, name: 'Tehran' },
    country: 'Iran',
    type: 'APT (MOIS)',
    color: '#ff6600',
    targetSectors: ['oil', 'natural_gas', 'grid'],
    description: 'Iranian MOIS-affiliated group targeting energy entities in MENA and globally. Confirmed targeting of 100+ organizations including energy sector per CISA AA22-055A. Uses spearphishing, supply chain access, and custom backdoors.',
  },
  {
    name: 'Salt Typhoon',
    aliases: ['Earth Estries', 'UNC2286'],
    mitreId: 'G1045',
    mitrePage: 'https://attack.mitre.org/groups/G1045/',
    ttps: [
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1098.004', name: 'Account Manipulation: SSH Authorized Keys', tactic: 'Persistence' },
      { id: 'T1136', name: 'Create Account', tactic: 'Persistence' },
      { id: 'T1562.004', name: 'Disable or Modify System Firewall', tactic: 'Defense Evasion' },
      { id: 'T1070.002', name: 'Clear Linux or Mac System Logs', tactic: 'Defense Evasion' },
      { id: 'T1110.002', name: 'Brute Force: Password Cracking', tactic: 'Credential Access' },
      { id: 'T1040', name: 'Network Sniffing', tactic: 'Discovery' },
      { id: 'T1602.002', name: 'Network Device Configuration Dump', tactic: 'Collection' },
      { id: 'T1572', name: 'Protocol Tunneling', tactic: 'Command and Control' },
      { id: 'T1048.003', name: 'Exfiltration Over Unencrypted Non-C2 Protocol', tactic: 'Exfiltration' },
    ],
    origin: { lat: 39.9, lng: 116.4, name: 'Beijing' },
    country: 'China',
    type: 'APT (MSS)',
    color: '#ff3333',
    targetSectors: ['grid', 'natural_gas'],
    description: 'Chinese MSS-affiliated group that compromised 200+ telecom companies across 80 countries. US Treasury sanctioned in Jan 2025. Targets critical infrastructure including energy and communications for intelligence collection.',
  },
  {
    name: 'Flax Typhoon',
    aliases: ['Ethereal Panda', 'Storm-0919'],
    // No formal MITRE ATT&CK group page; TTPs sourced from Microsoft threat intelligence (Aug 2023)
    ttps: [
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1505.003', name: 'Web Shell', tactic: 'Persistence' },
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation' },
      { id: 'T1546.008', name: 'Accessibility Features', tactic: 'Persistence' },
      { id: 'T1003.001', name: 'OS Credential Dumping: LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1550.002', name: 'Pass the Hash', tactic: 'Lateral Movement' },
      { id: 'T1021.006', name: 'Windows Remote Management', tactic: 'Lateral Movement' },
      { id: 'T1047', name: 'Windows Management Instrumentation', tactic: 'Execution' },
    ],
    origin: { lat: 39.9, lng: 116.4, name: 'Beijing' },
    country: 'China',
    type: 'APT',
    color: '#ff3333',
    targetSectors: ['grid'],
    description: 'Chinese intelligence contractor group (Integrity Technology Group) that operated a 200,000+ device IoT botnet disrupted by FBI in Sep 2024. Targets critical infrastructure including energy sector through compromised IoT devices.',
  },
  {
    name: 'Andariel',
    aliases: ['Onyx Sleet', 'Silent Chollima', 'Stonefly', 'PLUTONIUM'],
    mitreId: 'G0138',
    mitrePage: 'https://attack.mitre.org/groups/G0138/',
    ttps: [
      { id: 'T1189', name: 'Drive-by Compromise', tactic: 'Initial Access' },
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1203', name: 'Exploitation for Client Execution', tactic: 'Execution' },
      { id: 'T1204.002', name: 'User Execution: Malicious File', tactic: 'Execution' },
      { id: 'T1027.003', name: 'Steganography', tactic: 'Defense Evasion' },
      { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
      { id: 'T1005', name: 'Data from Local System', tactic: 'Collection' },
      { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' },
      { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access' },
    ],
    origin: { lat: 39.03, lng: 125.75, name: 'Pyongyang' },
    country: 'North Korea',
    type: 'APT (RGB 3rd Bureau)',
    color: '#ff2222',
    targetSectors: ['nuclear', 'grid'],
    description: 'North Korean RGB 3rd Bureau group targeting nuclear, defense, aerospace, and energy sectors. CISA AA24-207A (July 2024) documents campaigns against US critical infrastructure. Conducts espionage and ransomware operations.',
  },
]

// US Energy Infrastructure Facilities
export const energyFacilities: EnergyFacility[] = [
  // ===== NUCLEAR POWER PLANTS =====
  { id: 'nuc-palo-verde', lat: 33.39, lng: -112.86, name: 'Palo Verde Nuclear Generating Station', sector: 'nuclear', operator: 'Arizona Public Service', capacity: '3,937 MW' },
  { id: 'nuc-vogtle', lat: 33.14, lng: -81.76, name: 'Vogtle Electric Generating Plant', sector: 'nuclear', operator: 'Southern Nuclear', capacity: '4,800 MW' },
  { id: 'nuc-south-texas', lat: 28.80, lng: -96.05, name: 'South Texas Project', sector: 'nuclear', operator: 'STP Nuclear Operating', capacity: '2,710 MW' },
  { id: 'nuc-browns-ferry', lat: 34.70, lng: -87.12, name: 'Browns Ferry Nuclear Plant', sector: 'nuclear', operator: 'Tennessee Valley Authority', capacity: '3,309 MW' },
  { id: 'nuc-peach-bottom', lat: 39.76, lng: -76.27, name: 'Peach Bottom Atomic Power Station', sector: 'nuclear', operator: 'Exelon Generation', capacity: '2,770 MW' },
  { id: 'nuc-braidwood', lat: 41.24, lng: -88.21, name: 'Braidwood Nuclear Generating Station', sector: 'nuclear', operator: 'Exelon Generation', capacity: '2,386 MW' },
  { id: 'nuc-oconee', lat: 34.79, lng: -82.90, name: 'Oconee Nuclear Station', sector: 'nuclear', operator: 'Duke Energy', capacity: '2,538 MW' },
  { id: 'nuc-watts-bar', lat: 35.60, lng: -84.79, name: 'Watts Bar Nuclear Plant', sector: 'nuclear', operator: 'Tennessee Valley Authority', capacity: '2,330 MW' },
  { id: 'nuc-diablo', lat: 35.21, lng: -120.85, name: 'Diablo Canyon Power Plant', sector: 'nuclear', operator: 'Pacific Gas & Electric', capacity: '2,256 MW' },
  { id: 'nuc-comanche', lat: 32.30, lng: -97.78, name: 'Comanche Peak Nuclear Power Plant', sector: 'nuclear', operator: 'Luminant', capacity: '2,430 MW' },
  { id: 'nuc-calvert', lat: 38.43, lng: -76.44, name: 'Calvert Cliffs Nuclear Power Plant', sector: 'nuclear', operator: 'Exelon Generation', capacity: '1,756 MW' },
  { id: 'nuc-surry', lat: 37.17, lng: -76.70, name: 'Surry Nuclear Power Station', sector: 'nuclear', operator: 'Dominion Energy', capacity: '1,676 MW' },
  { id: 'nuc-columbia', lat: 46.47, lng: -119.33, name: 'Columbia Generating Station', sector: 'nuclear', operator: 'Energy Northwest', capacity: '1,190 MW' },
  { id: 'nuc-grand-gulf', lat: 32.01, lng: -91.05, name: 'Grand Gulf Nuclear Station', sector: 'nuclear', operator: 'Entergy', capacity: '1,443 MW' },
  { id: 'nuc-byron', lat: 42.08, lng: -89.28, name: 'Byron Nuclear Generating Station', sector: 'nuclear', operator: 'Exelon Generation', capacity: '2,347 MW' },
  { id: 'nuc-sequoyah', lat: 35.23, lng: -85.09, name: 'Sequoyah Nuclear Plant', sector: 'nuclear', operator: 'Tennessee Valley Authority', capacity: '2,326 MW' },
  { id: 'nuc-catawba', lat: 35.05, lng: -81.07, name: 'Catawba Nuclear Station', sector: 'nuclear', operator: 'Duke Energy', capacity: '2,258 MW' },
  { id: 'nuc-mcguire', lat: 35.43, lng: -80.95, name: 'McGuire Nuclear Station', sector: 'nuclear', operator: 'Duke Energy', capacity: '2,258 MW' },
  { id: 'nuc-limerick', lat: 40.22, lng: -75.59, name: 'Limerick Generating Station', sector: 'nuclear', operator: 'Constellation Energy', capacity: '2,264 MW' },
  { id: 'nuc-salem', lat: 39.46, lng: -75.54, name: 'Salem Nuclear Power Plant', sector: 'nuclear', operator: 'PSEG Nuclear', capacity: '2,275 MW' },
  { id: 'nuc-hope-creek', lat: 39.47, lng: -75.54, name: 'Hope Creek Nuclear Generating Station', sector: 'nuclear', operator: 'PSEG Nuclear', capacity: '1,237 MW' },
  { id: 'nuc-north-anna', lat: 38.06, lng: -77.79, name: 'North Anna Power Station', sector: 'nuclear', operator: 'Dominion Energy', capacity: '1,892 MW' },
  { id: 'nuc-turkey-point', lat: 25.43, lng: -80.33, name: 'Turkey Point Nuclear Generating Station', sector: 'nuclear', operator: 'NextEra Energy / FPL', capacity: '1,760 MW' },
  { id: 'nuc-nine-mile', lat: 43.52, lng: -76.41, name: 'Nine Mile Point Nuclear Station', sector: 'nuclear', operator: 'Constellation Energy', capacity: '1,937 MW' },
  { id: 'nuc-susquehanna', lat: 41.09, lng: -76.15, name: 'Susquehanna Steam Electric Station', sector: 'nuclear', operator: 'Talen Energy', capacity: '2,520 MW' },

  // ===== HYDROELECTRIC DAMS =====
  { id: 'hyd-grand-coulee', lat: 47.96, lng: -118.98, name: 'Grand Coulee Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '6,809 MW' },
  { id: 'hyd-hoover', lat: 36.02, lng: -114.74, name: 'Hoover Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '2,080 MW' },
  { id: 'hyd-glen-canyon', lat: 36.94, lng: -111.49, name: 'Glen Canyon Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '1,320 MW' },
  { id: 'hyd-chief-joseph', lat: 47.99, lng: -119.63, name: 'Chief Joseph Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '2,614 MW' },
  { id: 'hyd-niagara', lat: 43.14, lng: -79.04, name: 'Robert Moses Niagara Power Plant', sector: 'hydro', operator: 'New York Power Authority', capacity: '2,675 MW' },
  { id: 'hyd-bonneville', lat: 45.64, lng: -121.94, name: 'Bonneville Dam', sector: 'hydro', operator: 'US Army Corps of Engineers / BPA', capacity: '1,084 MW' },
  { id: 'hyd-john-day', lat: 45.72, lng: -120.69, name: 'John Day Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '2,160 MW' },
  { id: 'hyd-dalles', lat: 45.62, lng: -121.13, name: 'The Dalles Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '1,779 MW' },
  { id: 'hyd-shasta', lat: 40.72, lng: -122.42, name: 'Shasta Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '676 MW' },
  { id: 'hyd-oroville', lat: 39.54, lng: -121.48, name: 'Oroville Dam', sector: 'hydro', operator: 'CA Dept of Water Resources', capacity: '819 MW' },
  { id: 'hyd-fort-peck', lat: 48.00, lng: -106.41, name: 'Fort Peck Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '185 MW' },
  { id: 'hyd-garrison', lat: 47.50, lng: -101.43, name: 'Garrison Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '583 MW' },
  { id: 'hyd-bath-county', lat: 38.22, lng: -79.80, name: 'Bath County Pumped Storage Station', sector: 'hydro', operator: 'Dominion Energy', capacity: '3,003 MW' },
  { id: 'hyd-ludington', lat: 43.89, lng: -86.45, name: 'Ludington Pumped Storage Plant', sector: 'hydro', operator: 'Consumers Energy', capacity: '1,872 MW' },
  { id: 'hyd-raccoon-mt', lat: 35.06, lng: -85.38, name: 'Raccoon Mountain Pumped Storage', sector: 'hydro', operator: 'Tennessee Valley Authority', capacity: '1,616 MW' },

  // ===== GRID OPERATIONS / ISOs & RTOs =====
  { id: 'grd-pjm', lat: 40.09, lng: -75.47, name: 'PJM Interconnection', sector: 'grid', operator: 'PJM', capacity: '180 GW peak' },
  { id: 'grd-ercot', lat: 30.57, lng: -97.42, name: 'ERCOT Control Center', sector: 'grid', operator: 'ERCOT', capacity: '85 GW peak' },
  { id: 'grd-caiso', lat: 38.68, lng: -121.18, name: 'California ISO (CAISO)', sector: 'grid', operator: 'CAISO', capacity: '50 GW peak' },
  { id: 'grd-miso', lat: 39.98, lng: -86.13, name: 'MISO Control Center', sector: 'grid', operator: 'MISO', capacity: '127 GW peak' },
  { id: 'grd-spp', lat: 34.75, lng: -92.29, name: 'Southwest Power Pool', sector: 'grid', operator: 'SPP', capacity: '54 GW peak' },
  { id: 'grd-nyiso', lat: 42.64, lng: -73.74, name: 'New York ISO', sector: 'grid', operator: 'NYISO', capacity: '33 GW peak' },
  { id: 'grd-isone', lat: 42.20, lng: -72.62, name: 'ISO New England', sector: 'grid', operator: 'ISO-NE', capacity: '25 GW peak' },
  { id: 'grd-bpa', lat: 45.63, lng: -122.67, name: 'BPA Transmission Control', sector: 'grid', operator: 'Bonneville Power Administration', capacity: '31,000 mi transmission' },
  { id: 'grd-tva', lat: 35.05, lng: -85.31, name: 'TVA System Operations Center', sector: 'grid', operator: 'Tennessee Valley Authority', capacity: '30 GW capacity' },

  // ===== NATURAL GAS / LNG =====
  { id: 'gas-henry-hub', lat: 29.92, lng: -92.08, name: 'Henry Hub Natural Gas Terminal', sector: 'natural_gas', operator: 'Sabine Pipe Line LLC', capacity: 'US pricing benchmark' },
  { id: 'gas-sabine', lat: 29.77, lng: -93.84, name: 'Sabine Pass LNG Terminal', sector: 'natural_gas', operator: 'Cheniere Energy', capacity: '30 MTPA' },
  { id: 'gas-freeport', lat: 28.94, lng: -95.31, name: 'Freeport LNG Terminal', sector: 'natural_gas', operator: 'Freeport LNG', capacity: '15 MTPA' },
  { id: 'gas-cameron', lat: 30.01, lng: -93.33, name: 'Cameron LNG Terminal', sector: 'natural_gas', operator: 'Sempra Energy', capacity: '12 MTPA' },
  { id: 'gas-cove-point', lat: 38.40, lng: -76.39, name: 'Cove Point LNG Terminal', sector: 'natural_gas', operator: 'Dominion Energy', capacity: '5.25 MTPA' },
  { id: 'gas-elba', lat: 32.09, lng: -81.05, name: 'Elba Island LNG Terminal', sector: 'natural_gas', operator: 'Southern LNG', capacity: '2.5 MTPA' },
  { id: 'gas-corpus', lat: 27.83, lng: -97.20, name: 'Corpus Christi LNG Terminal', sector: 'natural_gas', operator: 'Cheniere Energy', capacity: '25 MTPA' },
  { id: 'gas-golden-pass', lat: 29.75, lng: -93.87, name: 'Golden Pass LNG Terminal', sector: 'natural_gas', operator: 'ExxonMobil / QatarEnergy', capacity: '18 MTPA', status: 'construction' },

  // ===== OIL & PETROLEUM =====
  { id: 'oil-spr-bryan', lat: 29.05, lng: -95.44, name: 'Strategic Petroleum Reserve (Bryan Mound)', sector: 'oil', operator: 'US Dept of Energy', capacity: '247M barrels capacity' },
  { id: 'oil-cushing', lat: 35.98, lng: -96.77, name: 'Cushing Oil Hub', sector: 'oil', operator: 'Multiple operators', capacity: 'US pricing benchmark' },
  { id: 'oil-port-arthur', lat: 29.90, lng: -93.93, name: 'Motiva Port Arthur Refinery', sector: 'oil', operator: 'Saudi Aramco / Motiva', capacity: '654,000 bbl/day' },
  { id: 'oil-baytown', lat: 29.75, lng: -95.01, name: 'ExxonMobil Baytown Refinery', sector: 'oil', operator: 'ExxonMobil', capacity: '584,000 bbl/day' },
  { id: 'oil-garyville', lat: 30.06, lng: -90.62, name: 'Marathon Garyville Refinery', sector: 'oil', operator: 'Marathon Petroleum', capacity: '578,000 bbl/day' },
  { id: 'oil-whiting', lat: 41.68, lng: -87.50, name: 'BP Whiting Refinery', sector: 'oil', operator: 'BP', capacity: '440,000 bbl/day' },
  { id: 'oil-baton-rouge', lat: 30.50, lng: -91.19, name: 'ExxonMobil Baton Rouge Refinery', sector: 'oil', operator: 'ExxonMobil', capacity: '502,500 bbl/day' },
  { id: 'oil-el-segundo', lat: 33.91, lng: -118.41, name: 'Chevron El Segundo Refinery', sector: 'oil', operator: 'Chevron', capacity: '290,000 bbl/day' },
  { id: 'oil-beaumont', lat: 30.05, lng: -94.13, name: 'ExxonMobil Beaumont Refinery', sector: 'oil', operator: 'ExxonMobil', capacity: '630,000 bbl/day' },
  { id: 'oil-galveston', lat: 29.38, lng: -94.91, name: 'Marathon Galveston Bay Refinery', sector: 'oil', operator: 'Marathon Petroleum', capacity: '631,000 bbl/day' },
  { id: 'oil-lake-charles', lat: 30.24, lng: -93.28, name: 'Citgo Lake Charles Refinery', sector: 'oil', operator: 'Citgo', capacity: '479,000 bbl/day' },
  { id: 'oil-valero-pa', lat: 29.87, lng: -93.95, name: 'Valero Port Arthur Refinery', sector: 'oil', operator: 'Valero', capacity: '380,000 bbl/day' },

  // ===== WATER SYSTEMS =====
  { id: 'wtr-jardine', lat: 41.90, lng: -87.61, name: 'Jardine Water Purification Plant', sector: 'water', operator: 'City of Chicago DWM', capacity: '1.4B gallons/day' },
  { id: 'wtr-blue-plains', lat: 38.84, lng: -77.01, name: 'Blue Plains Advanced WWTP', sector: 'water', operator: 'DC Water', capacity: '384M gallons/day' },
  { id: 'wtr-newtown', lat: 40.74, lng: -73.95, name: 'Newtown Creek WWTP', sector: 'water', operator: 'NYC Dept of Environmental Protection', capacity: '310M gallons/day' },
  { id: 'wtr-hyperion', lat: 33.92, lng: -118.42, name: 'Hyperion Water Reclamation Plant', sector: 'water', operator: 'LA Bureau of Sanitation', capacity: '450M gallons/day' },
  { id: 'wtr-southeast', lat: 37.75, lng: -122.39, name: 'Southeast Water Pollution Control Plant', sector: 'water', operator: 'SFPUC', capacity: '85M gallons/day' },
  { id: 'wtr-detroit', lat: 42.29, lng: -83.09, name: 'Great Lakes Water Authority WTP', sector: 'water', operator: 'GLWA', capacity: '720M gallons/day' },
]

// Region color mapping for the globe land dots
export const regionColors: Record<string, string> = {
  na: '#4a9eff',
  sa: '#4ac7ff',
  eu: '#6b8aff',
  ru: '#ff8844',
  af: '#66cc88',
  me: '#ffaa44',
  as: '#ff9944',
  oc: '#44ddaa',
}

// Simplified landmass dot coordinates for globe visualization
export const landPoints: GeoPoint[] = [
  // ===== NORTH AMERICA =====
  { lat: 64, lng: -153, region: 'na' }, { lat: 61, lng: -150, region: 'na' },
  { lat: 58, lng: -134, region: 'na' }, { lat: 66, lng: -162, region: 'na' },
  { lat: 71, lng: -156, region: 'na' }, { lat: 63, lng: -145, region: 'na' },
  { lat: 49, lng: -123, region: 'na' }, { lat: 53, lng: -122, region: 'na' },
  { lat: 55, lng: -120, region: 'na' }, { lat: 58, lng: -122, region: 'na' },
  { lat: 60, lng: -129, region: 'na' }, { lat: 60, lng: -115, region: 'na' },
  { lat: 55, lng: -110, region: 'na' }, { lat: 52, lng: -106, region: 'na' },
  { lat: 50, lng: -100, region: 'na' }, { lat: 53, lng: -95, region: 'na' },
  { lat: 56, lng: -90, region: 'na' }, { lat: 48, lng: -85, region: 'na' },
  { lat: 46, lng: -79, region: 'na' }, { lat: 48, lng: -72, region: 'na' },
  { lat: 47, lng: -67, region: 'na' }, { lat: 52, lng: -60, region: 'na' },
  { lat: 56, lng: -61, region: 'na' }, { lat: 60, lng: -64, region: 'na' },
  { lat: 63, lng: -68, region: 'na' }, { lat: 68, lng: -95, region: 'na' },
  { lat: 65, lng: -85, region: 'na' }, { lat: 70, lng: -120, region: 'na' },
  { lat: 73, lng: -80, region: 'na' }, { lat: 75, lng: -95, region: 'na' },
  { lat: 48, lng: -124, region: 'na' }, { lat: 45, lng: -124, region: 'na' },
  { lat: 42, lng: -124, region: 'na' }, { lat: 38, lng: -123, region: 'na' },
  { lat: 35, lng: -120, region: 'na' }, { lat: 34, lng: -119, region: 'na' },
  { lat: 33, lng: -117, region: 'na' }, { lat: 32, lng: -117, region: 'na' },
  { lat: 47, lng: -117, region: 'na' }, { lat: 47, lng: -111, region: 'na' },
  { lat: 47, lng: -104, region: 'na' }, { lat: 45, lng: -93, region: 'na' },
  { lat: 43, lng: -89, region: 'na' }, { lat: 42, lng: -83, region: 'na' },
  { lat: 39, lng: -105, region: 'na' }, { lat: 39, lng: -95, region: 'na' },
  { lat: 37, lng: -97, region: 'na' }, { lat: 35, lng: -97, region: 'na' },
  { lat: 35, lng: -90, region: 'na' }, { lat: 33, lng: -87, region: 'na' },
  { lat: 31, lng: -90, region: 'na' }, { lat: 30, lng: -95, region: 'na' },
  { lat: 42, lng: -71, region: 'na' }, { lat: 40, lng: -74, region: 'na' },
  { lat: 39, lng: -76, region: 'na' }, { lat: 37, lng: -76, region: 'na' },
  { lat: 35, lng: -79, region: 'na' }, { lat: 33, lng: -80, region: 'na' },
  { lat: 30, lng: -82, region: 'na' }, { lat: 27, lng: -80, region: 'na' },
  { lat: 26, lng: -80, region: 'na' }, { lat: 25, lng: -81, region: 'na' },
  { lat: 32, lng: -117, region: 'na' }, { lat: 30, lng: -110, region: 'na' },
  { lat: 27, lng: -109, region: 'na' }, { lat: 24, lng: -107, region: 'na' },
  { lat: 23, lng: -105, region: 'na' }, { lat: 20, lng: -103, region: 'na' },
  { lat: 19, lng: -99, region: 'na' }, { lat: 17, lng: -97, region: 'na' },
  { lat: 19, lng: -90, region: 'na' }, { lat: 21, lng: -87, region: 'na' },
  { lat: 15, lng: -90, region: 'na' }, { lat: 12, lng: -85, region: 'na' },
  { lat: 10, lng: -84, region: 'na' }, { lat: 9, lng: -80, region: 'na' },
  { lat: 19, lng: -72, region: 'na' }, { lat: 18, lng: -77, region: 'na' },
  { lat: 22, lng: -80, region: 'na' }, { lat: 18, lng: -66, region: 'na' },

  // ===== SOUTH AMERICA =====
  { lat: 10, lng: -67, region: 'sa' }, { lat: 8, lng: -63, region: 'sa' },
  { lat: 7, lng: -58, region: 'sa' }, { lat: 5, lng: -52, region: 'sa' },
  { lat: 2, lng: -50, region: 'sa' }, { lat: 0, lng: -50, region: 'sa' },
  { lat: -3, lng: -60, region: 'sa' }, { lat: -3, lng: -42, region: 'sa' },
  { lat: -5, lng: -35, region: 'sa' }, { lat: -8, lng: -35, region: 'sa' },
  { lat: -10, lng: -37, region: 'sa' }, { lat: -13, lng: -38, region: 'sa' },
  { lat: -15, lng: -47, region: 'sa' }, { lat: -10, lng: -55, region: 'sa' },
  { lat: -15, lng: -50, region: 'sa' }, { lat: -20, lng: -44, region: 'sa' },
  { lat: -23, lng: -43, region: 'sa' }, { lat: -25, lng: -48, region: 'sa' },
  { lat: -28, lng: -49, region: 'sa' }, { lat: -30, lng: -51, region: 'sa' },
  { lat: -33, lng: -52, region: 'sa' }, { lat: -20, lng: -55, region: 'sa' },
  { lat: -25, lng: -55, region: 'sa' }, { lat: -5, lng: -81, region: 'sa' },
  { lat: -8, lng: -80, region: 'sa' }, { lat: -12, lng: -77, region: 'sa' },
  { lat: -16, lng: -73, region: 'sa' }, { lat: -20, lng: -70, region: 'sa' },
  { lat: -27, lng: -70, region: 'sa' }, { lat: -33, lng: -72, region: 'sa' },
  { lat: -40, lng: -74, region: 'sa' }, { lat: -46, lng: -68, region: 'sa' },
  { lat: -50, lng: -70, region: 'sa' }, { lat: -54, lng: -69, region: 'sa' },
  { lat: 4, lng: -74, region: 'sa' }, { lat: -1, lng: -78, region: 'sa' },

  // ===== EUROPE =====
  { lat: 70, lng: 25, region: 'eu' }, { lat: 68, lng: 16, region: 'eu' },
  { lat: 65, lng: 14, region: 'eu' }, { lat: 63, lng: 10, region: 'eu' },
  { lat: 60, lng: 5, region: 'eu' }, { lat: 58, lng: 12, region: 'eu' },
  { lat: 56, lng: 10, region: 'eu' }, { lat: 60, lng: 18, region: 'eu' },
  { lat: 63, lng: 20, region: 'eu' }, { lat: 66, lng: 26, region: 'eu' },
  { lat: 58, lng: -5, region: 'eu' }, { lat: 56, lng: -3, region: 'eu' },
  { lat: 54, lng: -3, region: 'eu' }, { lat: 52, lng: -1, region: 'eu' },
  { lat: 51, lng: 0, region: 'eu' }, { lat: 50, lng: -5, region: 'eu' },
  { lat: 53, lng: -6, region: 'eu' }, { lat: 55, lng: -7, region: 'eu' },
  { lat: 49, lng: 2, region: 'eu' }, { lat: 47, lng: 2, region: 'eu' },
  { lat: 44, lng: 0, region: 'eu' }, { lat: 43, lng: -8, region: 'eu' },
  { lat: 37, lng: -8, region: 'eu' }, { lat: 36, lng: -6, region: 'eu' },
  { lat: 38, lng: -1, region: 'eu' }, { lat: 40, lng: -4, region: 'eu' },
  { lat: 42, lng: 3, region: 'eu' }, { lat: 44, lng: 6, region: 'eu' },
  { lat: 54, lng: 10, region: 'eu' }, { lat: 52, lng: 13, region: 'eu' },
  { lat: 50, lng: 14, region: 'eu' }, { lat: 48, lng: 16, region: 'eu' },
  { lat: 47, lng: 11, region: 'eu' }, { lat: 46, lng: 14, region: 'eu' },
  { lat: 52, lng: 21, region: 'eu' }, { lat: 50, lng: 24, region: 'eu' },
  { lat: 48, lng: 24, region: 'eu' }, { lat: 46, lng: 24, region: 'eu' },
  { lat: 44, lng: 26, region: 'eu' }, { lat: 47, lng: 28, region: 'eu' },
  { lat: 41, lng: 12, region: 'eu' }, { lat: 40, lng: 18, region: 'eu' },
  { lat: 38, lng: 24, region: 'eu' }, { lat: 37, lng: 23, region: 'eu' },
  { lat: 35, lng: 25, region: 'eu' }, { lat: 42, lng: 18, region: 'eu' },

  // ===== RUSSIA =====
  { lat: 60, lng: 30, region: 'ru' }, { lat: 56, lng: 44, region: 'ru' },
  { lat: 55, lng: 38, region: 'ru' }, { lat: 54, lng: 56, region: 'ru' },
  { lat: 55, lng: 73, region: 'ru' }, { lat: 57, lng: 60, region: 'ru' },
  { lat: 60, lng: 60, region: 'ru' }, { lat: 62, lng: 40, region: 'ru' },
  { lat: 64, lng: 40, region: 'ru' }, { lat: 66, lng: 44, region: 'ru' },
  { lat: 56, lng: 85, region: 'ru' }, { lat: 55, lng: 83, region: 'ru' },
  { lat: 52, lng: 104, region: 'ru' }, { lat: 58, lng: 92, region: 'ru' },
  { lat: 60, lng: 120, region: 'ru' }, { lat: 58, lng: 130, region: 'ru' },
  { lat: 55, lng: 132, region: 'ru' }, { lat: 48, lng: 135, region: 'ru' },
  { lat: 50, lng: 130, region: 'ru' }, { lat: 64, lng: 140, region: 'ru' },
  { lat: 60, lng: 150, region: 'ru' }, { lat: 62, lng: 160, region: 'ru' },
  { lat: 65, lng: 170, region: 'ru' }, { lat: 68, lng: 180, region: 'ru' },

  // ===== AFRICA =====
  { lat: 37, lng: 10, region: 'af' }, { lat: 35, lng: 0, region: 'af' },
  { lat: 33, lng: -7, region: 'af' }, { lat: 30, lng: -10, region: 'af' },
  { lat: 27, lng: -13, region: 'af' }, { lat: 32, lng: 13, region: 'af' },
  { lat: 34, lng: 10, region: 'af' }, { lat: 36, lng: 3, region: 'af' },
  { lat: 30, lng: 3, region: 'af' }, { lat: 28, lng: 10, region: 'af' },
  { lat: 31, lng: 30, region: 'af' }, { lat: 30, lng: 31, region: 'af' },
  { lat: 27, lng: 34, region: 'af' }, { lat: 24, lng: 33, region: 'af' },
  { lat: 15, lng: 33, region: 'af' }, { lat: 9, lng: 38, region: 'af' },
  { lat: 14, lng: -17, region: 'af' }, { lat: 12, lng: -16, region: 'af' },
  { lat: 10, lng: -14, region: 'af' }, { lat: 7, lng: -8, region: 'af' },
  { lat: 5, lng: -4, region: 'af' }, { lat: 6, lng: 2, region: 'af' },
  { lat: 4, lng: 10, region: 'af' }, { lat: 10, lng: 0, region: 'af' },
  { lat: 5, lng: 18, region: 'af' }, { lat: 0, lng: 30, region: 'af' },
  { lat: -2, lng: 29, region: 'af' }, { lat: -6, lng: 35, region: 'af' },
  { lat: -4, lng: 18, region: 'af' }, { lat: 2, lng: 45, region: 'af' },
  { lat: 12, lng: 42, region: 'af' }, { lat: 8, lng: 48, region: 'af' },
  { lat: -15, lng: 28, region: 'af' }, { lat: -8, lng: 32, region: 'af' },
  { lat: -20, lng: 30, region: 'af' }, { lat: -25, lng: 25, region: 'af' },
  { lat: -26, lng: 28, region: 'af' }, { lat: -30, lng: 30, region: 'af' },
  { lat: -34, lng: 26, region: 'af' }, { lat: -34, lng: 18, region: 'af' },
  { lat: -22, lng: 14, region: 'af' }, { lat: -18, lng: 12, region: 'af' },
  { lat: -12, lng: 17, region: 'af' }, { lat: -15, lng: 35, region: 'af' },

  // ===== MIDDLE EAST =====
  { lat: 33, lng: 44, region: 'me' }, { lat: 30, lng: 47, region: 'me' },
  { lat: 25, lng: 45, region: 'me' }, { lat: 24, lng: 54, region: 'me' },
  { lat: 22, lng: 59, region: 'me' }, { lat: 25, lng: 51, region: 'me' },
  { lat: 32, lng: 36, region: 'me' }, { lat: 37, lng: 40, region: 'me' },
  { lat: 39, lng: 33, region: 'me' }, { lat: 36, lng: 44, region: 'me' },

  // ===== SOUTH ASIA =====
  { lat: 28, lng: 77, region: 'as' }, { lat: 26, lng: 80, region: 'as' },
  { lat: 23, lng: 72, region: 'as' }, { lat: 20, lng: 73, region: 'as' },
  { lat: 17, lng: 78, region: 'as' }, { lat: 13, lng: 80, region: 'as' },
  { lat: 8, lng: 77, region: 'as' }, { lat: 21, lng: 88, region: 'as' },
  { lat: 23, lng: 90, region: 'as' }, { lat: 30, lng: 78, region: 'as' },
  { lat: 34, lng: 74, region: 'as' }, { lat: 28, lng: 84, region: 'as' },
  { lat: 7, lng: 80, region: 'as' },

  // ===== CENTRAL ASIA =====
  { lat: 42, lng: 60, region: 'as' }, { lat: 40, lng: 65, region: 'as' },
  { lat: 38, lng: 58, region: 'as' }, { lat: 42, lng: 70, region: 'as' },
  { lat: 44, lng: 65, region: 'as' }, { lat: 48, lng: 52, region: 'as' },
  { lat: 45, lng: 75, region: 'as' }, { lat: 43, lng: 77, region: 'as' },

  // ===== EAST ASIA =====
  { lat: 40, lng: 116, region: 'as' }, { lat: 35, lng: 117, region: 'as' },
  { lat: 31, lng: 121, region: 'as' }, { lat: 25, lng: 118, region: 'as' },
  { lat: 23, lng: 113, region: 'as' }, { lat: 22, lng: 114, region: 'as' },
  { lat: 25, lng: 102, region: 'as' }, { lat: 30, lng: 104, region: 'as' },
  { lat: 35, lng: 104, region: 'as' }, { lat: 38, lng: 106, region: 'as' },
  { lat: 40, lng: 112, region: 'as' }, { lat: 43, lng: 87, region: 'as' },
  { lat: 45, lng: 125, region: 'as' }, { lat: 48, lng: 125, region: 'as' },
  { lat: 35, lng: 129, region: 'as' }, { lat: 35, lng: 135, region: 'as' },
  { lat: 37, lng: 137, region: 'as' }, { lat: 39, lng: 140, region: 'as' },
  { lat: 42, lng: 141, region: 'as' }, { lat: 33, lng: 131, region: 'as' },
  { lat: 38, lng: 127, region: 'as' }, { lat: 36, lng: 127, region: 'as' },
  { lat: 34, lng: 126, region: 'as' },
  { lat: 25, lng: 121, region: 'as' }, { lat: 23, lng: 120, region: 'as' },

  // ===== SOUTHEAST ASIA =====
  { lat: 13, lng: 100, region: 'as' }, { lat: 10, lng: 99, region: 'as' },
  { lat: 7, lng: 100, region: 'as' }, { lat: 1, lng: 104, region: 'as' },
  { lat: -2, lng: 106, region: 'as' }, { lat: -7, lng: 110, region: 'as' },
  { lat: -8, lng: 112, region: 'as' }, { lat: 2, lng: 111, region: 'as' },
  { lat: 5, lng: 115, region: 'as' }, { lat: 15, lng: 101, region: 'as' },
  { lat: 18, lng: 103, region: 'as' }, { lat: 21, lng: 106, region: 'as' },
  { lat: 14, lng: 121, region: 'as' }, { lat: 10, lng: 124, region: 'as' },
  { lat: 7, lng: 126, region: 'as' },

  // ===== OCEANIA =====
  { lat: -12, lng: 131, region: 'oc' }, { lat: -15, lng: 129, region: 'oc' },
  { lat: -17, lng: 122, region: 'oc' }, { lat: -20, lng: 119, region: 'oc' },
  { lat: -24, lng: 114, region: 'oc' }, { lat: -28, lng: 114, region: 'oc' },
  { lat: -32, lng: 116, region: 'oc' }, { lat: -35, lng: 117, region: 'oc' },
  { lat: -35, lng: 137, region: 'oc' }, { lat: -38, lng: 145, region: 'oc' },
  { lat: -37, lng: 150, region: 'oc' }, { lat: -34, lng: 151, region: 'oc' },
  { lat: -27, lng: 153, region: 'oc' }, { lat: -23, lng: 150, region: 'oc' },
  { lat: -19, lng: 146, region: 'oc' }, { lat: -16, lng: 145, region: 'oc' },
  { lat: -12, lng: 137, region: 'oc' }, { lat: -25, lng: 134, region: 'oc' },
  { lat: -30, lng: 136, region: 'oc' }, { lat: -28, lng: 142, region: 'oc' },
  { lat: -37, lng: 175, region: 'oc' }, { lat: -39, lng: 176, region: 'oc' },
  { lat: -41, lng: 175, region: 'oc' }, { lat: -44, lng: 170, region: 'oc' },
  { lat: -46, lng: 168, region: 'oc' },
  { lat: -18, lng: 178, region: 'oc' }, { lat: -14, lng: 167, region: 'oc' },
  { lat: -9, lng: 160, region: 'oc' }, { lat: -6, lng: 155, region: 'oc' },
]
