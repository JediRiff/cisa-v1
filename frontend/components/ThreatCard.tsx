import { ExternalLink, Sparkles, Info } from 'lucide-react'

export interface ThreatItem {
  id: string
  title: string
  description: string
  link: string
  pubDate: string
  source: string
  sourceType: 'government' | 'vendor' | 'energy'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown'
  isEnergyRelevant: boolean
  // AI Analysis fields
  aiSeverityScore?: number
  aiThreatType?: 'apt' | 'ransomware' | 'vulnerability' | 'supply-chain' | 'other'
  aiUrgency?: 'active' | 'imminent' | 'emerging' | 'historical'
  aiAffectedVendors?: string[]
  aiAffectedSystems?: string[]
  aiAffectedProtocols?: string[]
  aiRationale?: string
}

interface ThreatCardProps {
  item: ThreatItem
  /** Show extended details like affected systems (used for energy-relevant cards) */
  showExtendedDetails?: boolean
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const getSeverityStyle = (severity: string) => {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return styles[severity] || 'bg-gray-100 text-gray-800 border-gray-200'
}

const getSourceStyle = (sourceType: string) => {
  const styles: Record<string, string> = {
    government: 'bg-blue-50 text-blue-700',
    vendor: 'bg-purple-50 text-purple-700',
    energy: 'bg-amber-50 text-amber-700',
  }
  return styles[sourceType] || 'bg-gray-50 text-gray-700'
}

const isCISASource = (source: string) => {
  return source.startsWith('CISA') || source === 'CISA KEV' ||
         source === 'CISA Advisories'
}

const getThreatTypeStyle = (type: string) => {
  const styles: Record<string, string> = {
    apt: 'bg-purple-600 text-white',
    ransomware: 'bg-red-600 text-white',
    vulnerability: 'bg-orange-500 text-white',
    'supply-chain': 'bg-pink-600 text-white',
    other: 'bg-gray-500 text-white',
  }
  return styles[type] || 'bg-gray-500 text-white'
}

const getThreatTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    apt: 'APT',
    ransomware: 'Ransomware',
    vulnerability: 'Vulnerability',
    'supply-chain': 'Supply Chain',
    other: 'Other',
  }
  return labels[type] || type
}

const getUrgencyStyle = (urgency: string) => {
  const styles: Record<string, string> = {
    active: 'bg-red-100 text-red-700 border border-red-300',
    imminent: 'bg-amber-100 text-amber-700 border border-amber-300',
    emerging: 'bg-blue-100 text-blue-700 border border-blue-300',
    historical: 'bg-gray-100 text-gray-600 border border-gray-300',
  }
  return styles[urgency] || 'bg-gray-100 text-gray-600'
}

const getUrgencyLabel = (urgency: string) => {
  const labels: Record<string, string> = {
    active: 'Active',
    imminent: 'Imminent',
    emerging: 'Emerging',
    historical: 'Historical',
  }
  return labels[urgency] || urgency
}

export default function ThreatCard({ item, showExtendedDetails = false }: ThreatCardProps) {
  return (
    <div className="p-3 sm:p-4 border border-gray-100 rounded-xl hover:bg-cisa-light transition-colors">
      <a href={item.link} target="_blank" rel="noopener noreferrer"
        className="font-medium text-gray-900 hover:text-cisa-navy flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {item.aiSeverityScore && (
            <span title="AI Analyzed"><Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" /></span>
          )}
          <span className="line-clamp-2 sm:line-clamp-none break-words">{item.title}</span>
        </div>
        <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1 hidden sm:block" />
      </a>
      {/* AI Analysis Badges */}
      {item.aiThreatType && (
        <div className="flex items-start gap-1.5 sm:gap-2 flex-wrap mb-2">
          <span className={'text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ' + getThreatTypeStyle(item.aiThreatType)}>
            {getThreatTypeLabel(item.aiThreatType)}
          </span>
          {item.aiUrgency && (
            <span className={'text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ' + getUrgencyStyle(item.aiUrgency)}>
              {getUrgencyLabel(item.aiUrgency)}
            </span>
          )}
          {item.aiAffectedVendors?.slice(0, showExtendedDetails ? 3 : 2).map((vendor, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded truncate max-w-[120px] sm:max-w-none">{vendor}</span>
          ))}
          {showExtendedDetails && item.aiAffectedSystems?.slice(0, 2).map((system, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded truncate max-w-[120px] sm:max-w-none">{system}</span>
          ))}
        </div>
      )}
      {/* AI Rationale - only shown for extended details */}
      {showExtendedDetails && item.aiRationale && (
        <p className="text-xs text-gray-500 italic mb-2 flex items-start gap-1 line-clamp-2 sm:line-clamp-none">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <span className="break-words">{item.aiRationale}</span>
        </p>
      )}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {isCISASource(item.source) && (
          <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded whitespace-nowrap">CISA</span>
        )}
        <span className={'text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium truncate max-w-[100px] sm:max-w-none ' + getSourceStyle(item.sourceType)}>{item.source}</span>
        <span className={'text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border font-medium whitespace-nowrap ' + getSeverityStyle(item.severity)}>{item.severity}</span>
        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(item.pubDate)}</span>
      </div>
    </div>
  )
}
