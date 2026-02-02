'use client'

import { ExternalLink } from 'lucide-react'
import { getRecommendations, type ThreatLevelConfig } from '@/lib/recommendations'

interface ActionableRecommendationsProps {
  score: number
}

export default function ActionableRecommendations({ score }: ActionableRecommendationsProps) {
  const config: ThreatLevelConfig = getRecommendations(score)

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Simple Header */}
        <h2 className="text-2xl font-bold text-cisa-navy mb-6">
          Recommended Actions
        </h2>

        {/* Compact Recommendations List */}
        <div className="space-y-2">
          {config.recommendations.map((rec, index) => (
            <div
              key={rec.id}
              className="flex items-center gap-3 p-3 bg-cisa-light rounded-lg"
              style={{ borderLeft: `4px solid ${config.color}` }}
            >
              {/* Number */}
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: config.color }}
              >
                {index + 1}
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900">{rec.title}</span>
                <span className="text-sm text-gray-500 ml-2 hidden md:inline">— {rec.description.split('.')[0]}</span>
              </div>

              {/* NERC CIP Link Only */}
              <a
                href={rec.nercCip.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-cisa-navy text-white rounded text-xs font-medium hover:bg-cisa-navy-dark transition-colors"
              >
                {rec.nercCip.control}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>

        {/* Additional Resources - Compact */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Resources:</span>
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
