export interface Alert {
  id: string
  title: string
  date: string
  posture: string // "Shields Up" or "Shields Ready"
  sector: string
  urgency: "Low" | "Medium" | "High"
  kev: boolean // Known Exploited Vulnerability
  exploitation: boolean
  criticalInfrastructure: boolean
  summary?: string
  url?: string
  source?: string // Added source field for TI attribution
}
