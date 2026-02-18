'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, MessageSquare } from 'lucide-react'

// GitHub repo URL for feedback submissions
const GITHUB_REPO = 'https://github.com/JediRiff/cisa-v1'

export default function ScoringMethodology() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section className="py-4 px-4 bg-white dark:bg-slate-900">
      <div className="max-w-4xl mx-auto">
        {/* Accordion Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-cisa-navy dark:text-blue-400" />
            <span className="font-semibold text-cisa-navy dark:text-blue-400">Scoring Methodology</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {/* Accordion Content */}
        {isOpen && (
          <div className="mt-2 p-6 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            {/* How It Works */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">How the Score is Calculated</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                CAPRI starts at 5.0 (Normal) and deducts points based on active threats
                detected across 12 intelligence sources. Lower scores indicate higher risk.
              </p>
            </div>

            {/* Scoring Factors Table */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Scoring Factors</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cisa-navy dark:bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left rounded-tl-lg">Factor</th>
                      <th className="px-3 py-2 text-center">Weight</th>
                      <th className="px-3 py-2 text-center">Max Impact</th>
                      <th className="px-3 py-2 text-left rounded-tr-lg">Why It Matters</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    <tr className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2 font-medium dark:text-gray-200">CISA KEV Entries</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.3 each</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-1.2</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Confirmed exploited. High volume, capped to prevent single-category spikes.</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-slate-800">
                      <td className="px-3 py-2 font-medium dark:text-gray-200">Nation-State Activity</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.4 each</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.8</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Highest weight. Strategic campaigns are rare but critical.</td>
                    </tr>
                    <tr className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2 font-medium dark:text-gray-200">ICS/SCADA Vulnerabilities</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.3 each</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.6</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Direct operational threat. Lower cap since ICS reports are less frequent.</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-slate-800">
                      <td className="px-3 py-2 font-medium dark:text-gray-200">AI-Assessed Energy Threats</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">Variable (-0.1 to -0.4)</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.8</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">AI analyzes threats with graduated severity: 9-10 critical (-0.4), 7-8 direct threat (-0.3), 5-6 relevant (-0.2), 3-4 tangential (-0.1). Keywords filter for display only.</td>
                    </tr>
                    <tr className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2 font-medium dark:text-gray-200">Vendor Critical Alerts</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.15 each</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">-0.4</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">High publication volume with variable quality.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
                Weight x Cap = Max Impact. SEVERE triggers only when multiple categories are active, not from a spike in one.
              </p>
            </div>

            {/* Score Thresholds */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Score Thresholds</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-600 rounded">
                  <p className="font-bold text-red-700 dark:text-red-400">1.0 - 2.0</p>
                  <p className="text-sm text-red-600 dark:text-red-400">SEVERE</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 rounded">
                  <p className="font-bold text-amber-700 dark:text-amber-400">2.1 - 3.0</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">ELEVATED</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-600 rounded">
                  <p className="font-bold text-green-700 dark:text-green-400">3.1 - 5.0</p>
                  <p className="text-sm text-green-600 dark:text-green-400">NORMAL</p>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Sources (11)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>CISA Known Exploited Vulnerabilities</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>CISA Cybersecurity Advisories</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>UK NCSC Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>Microsoft Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>Palo Alto Unit42</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>CrowdStrike Intelligence</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>SentinelOne Labs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>Cisco Talos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>Mandiant Threat Intel</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>Google Threat Analysis Group</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>The DFIR Report</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-1"></span> Government sources
                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full ml-3 mr-1"></span> Vendor sources
              </p>
            </div>

            {/* Feedback Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Not satisfied with the weights?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Submit feedback or propose adjustments via GitHub.
                  </p>
                </div>
                <a
                  href={`${GITHUB_REPO}/issues/new?template=weight-adjustment.yml`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-cisa-navy dark:bg-blue-600 text-white rounded-lg hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Submit Feedback
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
