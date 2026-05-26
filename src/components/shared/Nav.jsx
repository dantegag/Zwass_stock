import { useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

export default function Nav({ activeTab, onTabChange, sales }) {
  const todayTotalArs = useMemo(() => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return sales
      .filter(s => !s.voided_at && s.currency === 'ARS' && new Date(s.sold_at) >= startOfDay)
      .reduce((sum, s) => sum + Number(s.total_price || 0), 0)
  }, [sales])

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => onTabChange(id)}
      className={`relative px-3 sm:px-4 py-2 text-sm tracking-wider uppercase transition-colors ${
        activeTab === id ? 'text-accent' : 'text-muted hover:text-cream'
      }`}
    >
      {label}
      {activeTab === id && (
        <span className="absolute -bottom-px left-2 right-2 h-px bg-accent" />
      )}
    </button>
  )

  return (
    <nav className="border-b border-white/5 bg-surface/50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <TabButton id="stock" label="Stock" />
          <TabButton id="sales" label="Ventas" />
        </div>
        <div className="text-xs text-muted">
          Vendido hoy <span className="text-cream font-medium ml-1">{formatMoney(todayTotalArs, 'ARS')}</span>
        </div>
      </div>
    </nav>
  )
}
