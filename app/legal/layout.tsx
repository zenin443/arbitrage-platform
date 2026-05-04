import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0D1117', minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif", color: '#E6EDF3' }}>
      <div style={{ background: '#161B22', borderBottom: '1px solid #21262D' }} className="sticky top-0 z-30 px-6 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
          style={{ color: '#8B949E' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <span style={{ color: '#21262D' }}>|</span>
        <span style={{ color: '#388BFD', fontSize: '13px', fontWeight: 500 }}>Arbitrance Terminal</span>
        <span style={{ color: '#484F58', fontSize: '12px' }}>Legal</span>
      </div>
      {children}
    </div>
  )
}
