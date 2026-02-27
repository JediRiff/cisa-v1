import './globals.css'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ThemeProvider, ThemeToggle } from '@/components/ThemeProvider'

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
  },
  twitter: {
    card: 'summary',
    title: 'CAPRI - Cyber Alert Prioritization & Readiness Index',
    description: 'Real-time threat intelligence for US energy sector critical infrastructure',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of incorrect theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('capri-theme');
                  var theme = stored || 'system';
                  var resolved = theme;
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.add(resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-slate-900 transition-colors duration-300">
        <ThemeProvider>
          {/* Government-style red-white-blue top border */}
          <div className="govt-top-border" />

          <header className="bg-cisa-navy dark:bg-slate-800 text-white py-5 px-6 shadow-lg transition-colors duration-300">
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
                <div className="border-l border-white/30 pl-6 hidden sm:block">
                  <h1 className="text-2xl tracking-tight">CAPRI</h1>
                  <p className="text-sm text-blue-200 dark:text-blue-300 tracking-wide">Cyber Alert Prioritization & Readiness Index</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Navigation Tabs */}
                <nav className="hidden sm:flex items-center gap-1 mr-2">
                  <Link href="/" className="px-3 py-1.5 text-sm rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/globe" className="px-3 py-1.5 text-sm rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors">
                    Threat Map
                  </Link>
                </nav>
                {/* Theme Toggle Button */}
                <ThemeToggle />
                <div className="text-right hidden md:block">
                  <p className="text-xs text-blue-300 uppercase tracking-wider">Proposed for</p>
                  <p className="font-semibold text-white">CISA Shields Up</p>
                </div>
              </div>
            </div>
          </header>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
