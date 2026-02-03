import './globals.css'
import { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'CAPRI | Cyber Alert Prioritization & Readiness Index',
  description: 'CISA Cyber Alert Prioritization and Readiness Index',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Government-style red-white-blue top border */}
        <div className="govt-top-border" />

        <header className="bg-cisa-navy text-white py-5 px-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Official CISA Logo - white background for visibility */}
              <div className="bg-white rounded-lg px-3 py-2">
                <Image
                  src="/cisa-logo.svg"
                  alt="CISA - Cybersecurity and Infrastructure Security Agency"
                  width={160}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </div>
              <div className="border-l border-white/30 pl-6">
                <h1 className="text-xl font-bold tracking-tight">CAPRI</h1>
                <p className="text-sm text-blue-200 tracking-wide">Cyber Alert Prioritization & Readiness Index</p>
              </div>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs text-blue-300 uppercase tracking-wider">Proposed for</p>
              <p className="font-semibold text-white">CISA Shields Up</p>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
