'use client'

import { FileText, Printer } from 'lucide-react'
import { getRecommendations } from '@/lib/recommendations'

interface ThreatItem {
  id: string
  title: string
  source: string
  severity: string
  pubDate: string
}

interface QuickExportProps {
  score: number
  label: string
  color: string
  sourcesOnline: number
  sourcesTotal: number
  threats: ThreatItem[]
  lastUpdated: string
}

export default function QuickExport({
  score,
  label,
  sourcesOnline,
  sourcesTotal,
  threats,
}: QuickExportProps) {
  const config = getRecommendations(score)

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Export Buttons - Visible on screen */}
      <section className="py-12 px-4 bg-cisa-light print:hidden">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="hero-heading text-3xl md:text-4xl text-cisa-navy mb-3">
              Generate Briefing
            </h2>
            <p className="text-lg text-gray-600">
              One-click reports for shift handoffs and leadership briefings
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Executive Summary */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all group text-left"
            >
              <div className="w-14 h-14 bg-cisa-navy rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Executive Summary</h3>
                <p className="text-gray-600">Score, top threats, and recommended actions</p>
              </div>
            </button>

            {/* Print View */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all group text-left"
            >
              <div className="w-14 h-14 bg-cisa-navy rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Printer className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Print Report</h3>
                <p className="text-gray-600">Optimized for printing or PDF export</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Print-Only Content - Hidden on screen, visible when printing */}
      {/* Simplified 3-4 sentence briefing */}
      <div className="hidden print:block print-report">
        <div className="max-w-2xl mx-auto py-8">
          {/* Header */}
          <div className="border-b-2 border-cisa-navy pb-4 mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-cisa-navy">CAPRI Briefing</h1>
              <p className="text-gray-600">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Brief Summary - 3-4 sentences */}
          <div className="text-lg leading-relaxed text-gray-800 space-y-4">
            <p>
              <strong style={{ color: config.color }}>Current threat level is {label.toUpperCase()} ({score.toFixed(1)})</strong> based on {threats.length} alerts from {sourcesOnline} active intelligence sources.
              {threats.length > 0 && ` Top threats include ${threats.slice(0, 2).map(t => t.title.substring(0, 40)).join(', ')}.`}
            </p>

            <p>
              <strong>Recommended action:</strong> {config.recommendations[0]?.title || 'Continue routine monitoring'}.
              {config.recommendations[0]?.description && ` ${config.recommendations[0].description.split('.')[0]}.`}
            </p>

            <p className="text-gray-600 text-base">
              Sources: {sourcesOnline}/{sourcesTotal} online | E-ISAC: eisac.com | CISA: cisa.gov/shields-up
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>CAPRI | Cyber Alert Prioritization & Readiness Index</p>
            <p>Validate with primary sources before action.</p>
          </div>
        </div>
      </div>
    </>
  )
}
