'use client'

import { ExternalLink } from 'lucide-react'

export interface KEVAction {
  cveId: string
  vendor: string
  product: string
  dueDate: string
  description: string
  advisoryUrl: string
  nvdUrl: string
  isOverdue: boolean
  ransomwareUse: boolean
}

interface ActionableRecommendationsProps {
  kevItems: KEVAction[]
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActionableRecommendations({ kevItems }: ActionableRecommendationsProps) {
  // Sort: overdue first, then by due date (most urgent first)
  const sortedItems = [...kevItems].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-cisa-navy mb-6">
          Recommended Actions
        </h2>

        {kevItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active KEV items requiring action.</p>
        ) : (
          <div className="space-y-3">
            {sortedItems.slice(0, 5).map((item) => (
              <div
                key={item.cveId}
                className={`p-4 rounded-lg border-l-4 ${
                  item.isOverdue
                    ? 'bg-red-50 border-red-600'
                    : 'bg-cisa-light border-amber-500'
                }`}
              >
                {/* Header: Badges + Product + CVE */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {item.isOverdue && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded uppercase">
                      Overdue
                    </span>
                  )}
                  {item.ransomwareUse && (
                    <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded uppercase">
                      Ransomware
                    </span>
                  )}
                  <span className="font-bold text-gray-900">
                    {item.vendor} {item.product}
                  </span>
                  <span className="text-gray-500 text-sm">— {item.cveId}</span>
                </div>

                {/* Description + Due Date */}
                <p className="text-sm text-gray-700 mb-3">
                  {item.description.length > 150
                    ? item.description.slice(0, 150) + '...'
                    : item.description}
                  <span className={`ml-2 font-semibold ${item.isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                    Due {formatDueDate(item.dueDate)}.
                  </span>
                </p>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  {item.advisoryUrl && (
                    <a
                      href={item.advisoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-cisa-navy hover:underline"
                    >
                      → Vendor Advisory
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <a
                    href={item.nvdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline"
                  >
                    NVD Details
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resources Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-500">Resources:</span>
            <a
              href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cisa-navy hover:underline font-medium"
            >
              Full KEV Catalog
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://www.eisac.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cisa-navy hover:underline font-medium"
            >
              E-ISAC Portal
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://www.nerc.com/pa/Stand/Pages/ReliabilityStandards.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cisa-navy hover:underline font-medium"
            >
              NERC Standards
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
