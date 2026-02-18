import './globals.css'
import { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'CAPRI - Cyber Alert Prioritization & Readiness Index | CISA',
  description: 'Real-time threat intelligence dashboard for US energy sector critical infrastructure. Monitor cyber threats, ICS vulnerabilities, and security alerts with CISA Shields Up integration.',
  keywords: [
    'cybersecurity',
    'threat intelligence',
    'energy sector',
    'CISA',
    'ICS security',
    'critical infrastructure',
    'SCADA security',
    'OT security',
    'cyber alerts',
    'vulnerability management',
    'Shields Up',
    'industrial control systems',
  ],
  authors: [{ name: 'CISA - Cybersecurity and Infrastructure Security Agency' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'CAPRI - Cyber Alert Prioritization & Readiness Index',
    description: 'Real-time threat intelligence dashboard for US energy sector critical infrastructure. Monitor cyber threats and security alerts.',
    type: 'website',
    locale: 'en_US',
    siteName: 'CAPRI Dashboard',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CAPRI Dashboard - Cyber Threat Intelligence for Energy Sector',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CAPRI - Cyber Alert Prioritization & Readiness Index',
    description: 'Real-time threat intelligence for US energy sector critical infrastructure',
    images: ['/og-image.png'],
    creator: '@CISAgov',
    site: '@CISAgov',
  },
  metadataBase: new URL('https://capri.cisa.gov'),
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white">
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
