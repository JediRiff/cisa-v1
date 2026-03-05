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
          {/* Skip to main content link for keyboard/screen reader users */}
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-cisa-navy focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium">
            Skip to main content
          </a>

          {/* Government-style red-white-blue top border */}
          <div className="govt-top-border" />

          <header className="bg-cisa-navy dark:bg-slate-800 text-white py-3 sm:py-5 px-4 sm:px-6 shadow-lg transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-6">
                {/* Official CISA Logo - white background for visibility */}
                <div className="bg-white rounded-lg px-2 py-1.5 sm:px-3 sm:py-2">
                  <Image
                    src="/cisa-logo.svg"
                    alt="CISA - Cybersecurity and Infrastructure Security Agency"
                    width={160}
                    height={32}
                    className="h-6 sm:h-8 w-auto"
                    priority
                  />
                </div>
                {/* Mini ASCII Flag */}
                <pre className="hidden md:block text-[6px] lg:text-[7px] leading-[1.2] select-none" style={{ fontFamily: 'Consolas, "Courier New", monospace' }} aria-hidden="true">{
`\n`}<span className="text-white bg-blue-700">{`* * *`}</span><span className="text-red-500">{` ████████`}</span>{
`\n`}<span className="text-white bg-blue-700">{` * * `}</span>{`         `}{
`\n`}<span className="text-white bg-blue-700">{`* * *`}</span><span className="text-red-500">{` ████████`}</span>{
`\n`}<span className="text-white bg-blue-700">{` * * `}</span>{`         `}{
`\n`}<span className="text-red-500">{`██████████████`}</span>{
`\n`}{`              `}{
`\n`}<span className="text-red-500">{`██████████████`}</span>
                </pre>
                <div className="border-l border-white/30 pl-4 md:pl-6 hidden sm:block">
                  <pre className="text-[5px] md:text-[6px] leading-[1.1] font-mono text-white select-none" aria-hidden="true">{
` ██████╗ █████╗ ██████╗ ██████╗ ██╗\n`}{
`██╔════╝██╔══██╗██╔══██╗██╔══██╗██║\n`}{
`██║     ███████║██████╔╝██████╔╝██║\n`}{
`██║     ██╔══██║██╔═══╝ ██╔══██║██║\n`}{
`╚██████╗██║  ██║██║     ██║  ██║██║\n`}{
` ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝`
                  }</pre>
                  <h1 className="sr-only">CAPRI</h1>
                  <p className="text-[10px] md:text-xs text-blue-200 dark:text-blue-300 tracking-wide mt-0.5">Cyber Alert Prioritization &amp; Readiness Index</p>
                </div>
                {/* Mobile: show CAPRI text instead of ASCII art */}
                <div className="sm:hidden border-l border-white/30 pl-3">
                  <h1 className="text-sm font-bold tracking-wide">CAPRI</h1>
                  <p className="text-[9px] text-blue-200">Threat Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Navigation Tabs - visible on sm+ */}
                <nav className="hidden sm:flex items-center gap-1 mr-2">
                  <Link href="/" className="px-3 py-1.5 text-sm rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cisa-navy">
                    Dashboard
                  </Link>
                  <Link href="/globe" className="px-3 py-1.5 text-sm rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cisa-navy">
                    Threat Map
                  </Link>
                </nav>
                {/* Mobile nav: globe link */}
                <Link href="/globe" className="sm:hidden px-2.5 py-1.5 text-xs rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors" aria-label="Threat Map">
                  Map
                </Link>
                {/* Theme Toggle Button */}
                <ThemeToggle />
                <div className="text-right hidden md:block">
                  <p className="text-xs text-blue-300 uppercase tracking-wider">Proposed for</p>
                  <p className="font-semibold text-white">CISA Shields Up</p>
                </div>
              </div>
            </div>
          </header>
          <main id="main-content">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
