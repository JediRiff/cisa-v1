'use client'

import { useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'

export interface KEVAction {
  cveId: string
  vendor: string
  product: string
  dueDate: string
  dateAdded: string
  description: string
  advisoryUrl: string
  nvdUrl: string
  isOverdue: boolean
  ransomwareUse: boolean
}

// Format the date when KEV was added to catalog
function formatAddedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

interface ActionableRecommendationsProps {
  kevItems: KEVAction[]
}

// Convert due date to relative time (e.g., "in 9 days" or "3 days ago")
function getRelativeTime(dateStr: string): { text: string; isOverdue: boolean; daysUntil: number } {
  const dueDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)

  const diffMs = dueDate.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    return {
      text: absDays === 1 ? '1 day overdue' : `${absDays} days overdue`,
      isOverdue: true,
      daysUntil: diffDays
    }
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false, daysUntil: 0 }
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', isOverdue: false, daysUntil: 1 }
  } else {
    return { text: `Due in ${diffDays} days`, isOverdue: false, daysUntil: diffDays }
  }
}

// Generate plain English explanation of why the vulnerability matters
function getWhyItMatters(description: string, vendor: string, product: string): string {
  const desc = description.toLowerCase()

  if (desc.includes('remote code execution') || desc.includes('rce') || desc.includes('execute arbitrary code')) {
    return `Attackers can run malicious code on ${product} systems without physical access.`
  }
  if (desc.includes('authentication bypass') || desc.includes('auth bypass') || desc.includes('bypass authentication')) {
    return `Attackers can gain access to ${product} without valid credentials.`
  }
  if (desc.includes('privilege escalation') || desc.includes('elevate privileges')) {
    return `Attackers with limited access can gain administrator-level control.`
  }
  if (desc.includes('sql injection')) {
    return `Attackers can access or modify your database through ${product}.`
  }
  if (desc.includes('denial of service') || desc.includes('dos attack')) {
    return `Attackers can crash or disable ${product}, causing outages.`
  }
  if (desc.includes('information disclosure') || desc.includes('data exposure') || desc.includes('sensitive information')) {
    return `Sensitive data may be exposed to unauthorized users.`
  }
  if (desc.includes('cross-site scripting') || desc.includes('xss')) {
    return `Attackers can inject malicious scripts that run in users' browsers.`
  }
  if (desc.includes('path traversal') || desc.includes('directory traversal')) {
    return `Attackers can access files outside the intended directory.`
  }
  if (desc.includes('buffer overflow') || desc.includes('memory corruption')) {
    return `Attackers can crash ${product} or run malicious code by overloading memory.`
  }
  if (desc.includes('arbitrary file') || desc.includes('file upload') || desc.includes('file write')) {
    return `Attackers can read, write, or delete files on your systems.`
  }
  if (desc.includes('deserialization') || desc.includes('deserialize')) {
    return `Attackers can execute code by sending specially crafted data to ${product}.`
  }
  if (desc.includes('command injection') || desc.includes('os command')) {
    return `Attackers can run system commands on servers running ${product}.`
  }

  // Default fallback
  return `This vulnerability in ${vendor} ${product} is actively exploited in the wild. Patch immediately.`
}

export default function ActionableRecommendations({ kevItems }: ActionableRecommendationsProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Sort: overdue first, then by due date (most urgent first)
  const sortedItems = [...kevItems].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  // Filter by search query
  const filteredItems = searchQuery.trim()
    ? sortedItems.filter(item =>
        item.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cveId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedItems

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-cisa-navy mb-4">
          Recommended Actions
        </h2>

        {/* Vendor Quick Check */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor or product (e.g., Fortinet, Cisco)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-cisa-navy focus:outline-none"
            />
          </div>
          {searchQuery.trim() && (
            <div className="mt-2 text-sm">
              {filteredItems.length === 0 ? (
                <span className="text-green-600 font-medium">✓ No active KEVs match "{searchQuery}"</span>
              ) : (
                <span className="text-amber-600 font-medium">⚠ {filteredItems.length} active KEV{filteredItems.length !== 1 ? 's' : ''} match "{searchQuery}"</span>
              )}
            </div>
          )}
        </div>

        {kevItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active KEV items requiring action.</p>
        ) : (
          <div className="space-y-4">
            {filteredItems.slice(0, 5).map((item) => {
              const relativeTime = getRelativeTime(item.dueDate)

              return (
                <div
                  key={item.cveId}
                  className={`p-4 rounded-lg border-l-4 ${
                    item.isOverdue
                      ? 'bg-red-50 border-red-600'
                      : 'bg-cisa-light border-cisa-navy'
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

                  {/* Due Date - Relative Time */}
                  <p className={`text-sm font-semibold mb-2 ${relativeTime.isOverdue ? 'text-red-600' : 'text-cisa-navy'}`}>
                    <span className="text-gray-500 font-normal">Added to KEV:</span> {formatAddedDate(item.dateAdded)} · {relativeTime.text}
                  </p>

                  {/* Why It Matters - Plain English */}
                  <div className="mb-3 p-3 bg-white/50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-800">Why it matters:</span>{' '}
                      {getWhyItMatters(item.description, item.vendor, item.product)}
                    </p>
                  </div>

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
              )
            })}
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
