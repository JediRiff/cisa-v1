'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, ExternalLink } from 'lucide-react'

export default function ScoringMethodology() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section className="py-4 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Accordion Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-cisa-navy" />
            <span className="font-semibold text-cisa-navy">Scoring Methodology</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {/* Accordion Content */}
        {isOpen && (
          <div className="mt-2 p-6 bg-gray-50 rounded-lg border border-gray-200">
            {/* How It Works */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-2">How the Score is Calculated</h3>
              <p className="text-sm text-gray-600">
                CAPRI starts at 5.0 (Normal) and deducts points based on active threats
                detected across 9 intelligence sources. Lower scores indicate higher risk.
              </p>
            </div>

            {/* Scoring Factors Table */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Scoring Factors</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cisa-navy text-white">
                    <tr>
                      <th className="px-3 py-2 text-left rounded-tl-lg">Factor</th>
                      <th className="px-3 py-2 text-center">Weight</th>
                      <th className="px-3 py-2 text-center">Max Impact</th>
                      <th className="px-3 py-2 text-left rounded-tr-lg">Why It Matters</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="bg-white">
                      <td className="px-3 py-2 font-medium">CISA KEV Entries</td>
                      <td className="px-3 py-2 text-center">-0.3 each</td>
                      <td className="px-3 py-2 text-center">-1.5</td>
                      <td className="px-3 py-2 text-gray-600">Known exploited vulnerabilities require immediate patching</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-3 py-2 font-medium">Nation-State Activity</td>
                      <td className="px-3 py-2 text-center">-0.4 each</td>
                      <td className="px-3 py-2 text-center">-1.2</td>
                      <td className="px-3 py-2 text-gray-600">APT groups (Volt Typhoon, Sandworm) targeting infrastructure</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-2 font-medium">ICS/SCADA Vulnerabilities</td>
                      <td className="px-3 py-2 text-center">-0.3 each</td>
                      <td className="px-3 py-2 text-center">-0.9</td>
                      <td className="px-3 py-2 text-gray-600">Industrial control system threats directly impact operations</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-3 py-2 font-medium">Energy Sector Threats</td>
                      <td className="px-3 py-2 text-center">-0.2 each</td>
                      <td className="px-3 py-2 text-center">-1.0</td>
                      <td className="px-3 py-2 text-gray-600">Threats mentioning grid, SCADA, or critical infrastructure</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-2 font-medium">Vendor Critical Alerts</td>
                      <td className="px-3 py-2 text-center">-0.15 each</td>
                      <td className="px-3 py-2 text-center">-0.6</td>
                      <td className="px-3 py-2 text-gray-600">Critical severity reports from security vendors</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Score Thresholds */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Score Thresholds</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-red-50 border-l-4 border-red-600 rounded">
                  <p className="font-bold text-red-700">1.0 - 2.0</p>
                  <p className="text-sm text-red-600">SEVERE</p>
                </div>
                <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded">
                  <p className="font-bold text-amber-700">2.1 - 3.0</p>
                  <p className="text-sm text-amber-600">ELEVATED</p>
                </div>
                <div className="p-3 bg-green-50 border-l-4 border-green-600 rounded">
                  <p className="font-bold text-green-700">3.1 - 5.0</p>
                  <p className="text-sm text-green-600">NORMAL</p>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Intelligence Sources</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
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
                  <span>CISA ICS-CERT Advisories</span>
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
                  <span>Mandiant Threat Intel</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>SANS Internet Storm Center</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-1"></span> Government sources
                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full ml-3 mr-1"></span> Vendor sources
              </p>
            </div>

            {/* Reference Standards */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Reference Standards</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <a
                  href="https://www.nist.gov/cyberframework"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                >
                  NIST CSF 2.0
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                >
                  NERC CIP Standards
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://attack.mitre.org/techniques/ics/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                >
                  MITRE ATT&CK for ICS
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
