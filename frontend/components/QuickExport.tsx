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

      {/* Print-Only Content - Single page briefing */}
      <div className="hidden print:block print-report">
        <div className="max-w-xl mx-auto py-6">
          <div className="border-b-2 border-cisa-navy pb-3 mb-4 flex justify-between items-center">
            <span className="text-xl font-bold text-cisa-navy">CAPRI Briefing</span>
            <span className="text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <div className="space-y-3 text-base">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-semibold">Threat Level</span>
              <span className="font-bold" style={{ color: config.color }}>{label.toUpperCase()} ({score.toFixed(1)})</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-semibold">New Alerts</span>
              <span>{threats.length} this week</span>
            </div>
            {threats.length > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-semibold">Top Concern</span>
                <span className="text-right max-w-xs truncate">{threats[0].title.substring(0, 50)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-semibold">Action</span>
              <span>{config.recommendations[0]?.title || 'Continue monitoring'}</span>
            </div>
            <div className="text-sm text-gray-500 pt-2">
              Sources: {sourcesOnline}/{sourcesTotal} online | cisa.gov/shields-up
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
