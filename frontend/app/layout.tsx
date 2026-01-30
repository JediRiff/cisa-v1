import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CAPRI-E | Energy Sector Cyber Risk Index',
  description: 'CISA Alert Prioritization and Readiness Index for the Energy Sector',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-cisa-navy text-white py-4 px-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">CAPRI-E</h1>
              <p className="text-sm text-blue-200">Energy Sector Cyber Risk Index</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-blue-200">Proposed for CISA</p>
              <p className="font-medium">Shields Up Integration</p>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-cisa-navy text-white py-4 px-6 mt-8">
          <div className="max-w-7xl mx-auto text-center text-sm">
            <p>CAPRI-E Prototype | Not an official CISA product</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
