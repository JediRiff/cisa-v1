import Anthropic from '@anthropic-ai/sdk'

// Types for AI analysis results
export type ThreatType = 'apt' | 'ransomware' | 'vulnerability' | 'supply-chain' | 'other'
export type Urgency = 'active' | 'imminent' | 'emerging' | 'historical'

export interface AIAnalysisResult {
  id: string
  severityScore: number           // 1-10
  threatType: ThreatType
  urgency: Urgency
  affectedVendors: string[]
  affectedSystems: string[]
  affectedProtocols: string[]
  rationale: string
}

interface ThreatItemInput {
  id: string
  title: string
  description: string
  source: string
}

const ANALYSIS_PROMPT = `You are an energy sector cybersecurity analyst. Analyze these threat intelligence items for relevance to US energy infrastructure (power grids, pipelines, utilities, ICS/SCADA).

For each item, provide JSON with:
- id: The item's ID (pass through unchanged)
- severityScore (1-10): How critical to energy operations
- threatType: "apt" | "ransomware" | "vulnerability" | "supply-chain" | "other"
- urgency: "active" | "imminent" | "emerging" | "historical"
- affectedVendors: Array of ICS/OT vendors mentioned (Siemens, Schneider, ABB, GE, Honeywell, Cisco, Rockwell, etc.) - empty array if none
- affectedSystems: Array of systems (SCADA, DCS, PLC, RTU, HMI, EMS, Historian, etc.) - empty array if none
- affectedProtocols: Array of protocols (Modbus, DNP3, IEC 61850, OPC, BACnet, etc.) - empty array if none
- rationale: One sentence explaining the severity score

Severity guide:
- 9-10: Active nation-state campaign targeting energy/ICS (e.g., Volt Typhoon, Sandworm)
- 7-8: Direct threat to energy infrastructure or ICS systems
- 5-6: Relevant to energy sector IT/OT environments
- 3-4: Tangential mention, not energy-specific
- 1-2: False positive, not actually relevant to energy sector security

Items to analyze:
`

/**
 * Analyzes threat items using Claude AI to determine energy sector relevance and severity
 * @param items Array of threat items to analyze
 * @returns Array of AI analysis results, or empty array if analysis fails
 */
export async function analyzeThreatsWithAI(items: ThreatItemInput[]): Promise<AIAnalysisResult[]> {
  // Skip if no API key configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured - skipping AI analysis')
    return []
  }

  // Skip if no items to analyze
  if (items.length === 0) {
    return []
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Prepare items for analysis (limit context size)
    const itemsForAnalysis = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description.substring(0, 500), // Limit description length
      source: item.source,
    }))

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: ANALYSIS_PROMPT + JSON.stringify(itemsForAnalysis, null, 2) + '\n\nRespond with a JSON array only, no other text.',
        },
      ],
    })

    // Extract text content from response
    const textContent = message.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      console.error('AI analysis returned no text content')
      return []
    }

    // Parse JSON response
    const responseText = textContent.text.trim()

    // Handle potential markdown code blocks
    let jsonText = responseText
    if (responseText.startsWith('```')) {
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) {
        jsonText = match[1].trim()
      }
    }

    const results: AIAnalysisResult[] = JSON.parse(jsonText)

    // Validate and sanitize results
    return results.map(result => ({
      id: result.id,
      severityScore: Math.min(10, Math.max(1, Number(result.severityScore) || 5)),
      threatType: validateThreatType(result.threatType),
      urgency: validateUrgency(result.urgency),
      affectedVendors: Array.isArray(result.affectedVendors) ? result.affectedVendors : [],
      affectedSystems: Array.isArray(result.affectedSystems) ? result.affectedSystems : [],
      affectedProtocols: Array.isArray(result.affectedProtocols) ? result.affectedProtocols : [],
      rationale: result.rationale || 'No rationale provided',
    }))

  } catch (error) {
    console.error('AI analysis failed:', error)
    return []
  }
}

function validateThreatType(type: string): ThreatType {
  const validTypes: ThreatType[] = ['apt', 'ransomware', 'vulnerability', 'supply-chain', 'other']
  return validTypes.includes(type as ThreatType) ? (type as ThreatType) : 'other'
}

function validateUrgency(urgency: string): Urgency {
  const validUrgencies: Urgency[] = ['active', 'imminent', 'emerging', 'historical']
  return validUrgencies.includes(urgency as Urgency) ? (urgency as Urgency) : 'emerging'
}

/**
 * Maps AI severity score to CAPRI impact value
 * Higher severity = more negative impact on score
 */
export function getImpactFromAISeverity(severityScore: number): number {
  if (severityScore >= 9) return -0.4   // Critical
  if (severityScore >= 7) return -0.3   // Direct threat
  if (severityScore >= 5) return -0.2   // Relevant
  if (severityScore >= 3) return -0.1   // Tangential
  return 0                               // False positive
}
