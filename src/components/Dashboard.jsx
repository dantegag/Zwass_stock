import { useState } from 'react'
import {
  CubeIcon, ArchiveBoxIcon, ExclamationCircleIcon,
  ExclamationTriangleIcon, BanknotesIcon, ShoppingBagIcon,
  LockClosedIcon, EyeIcon, EyeSlashIcon
} from '@heroicons/react/24/outline'
import PinModal from './PinModal'
import { formatARS } from '../lib/formatCurrency'

export default function Dashboard({ products }) {
  const [unlocked, setUnlocked] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const total = products.length
  const totalUnits = products.reduce((s, p) => s + (p.quantity || 0), 0)
  const outOfStock = products.filter(p => p.quantity === 0).length
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 3).length
  const costValue = products.reduce((s, p) => s + (p.cost_price || 0) * (p.quantity || 0), 0)
  const saleValue = products.reduce((s, p) => s + (p.sale_price || 0) * (p.quantity || 0), 0)

  const StatCard = ({ icon: Icon, label, value, color = 'text-cream', valueClass = '' }) => (
    <div className="bg-card border border-white/5 rounded-xl p-5 flex items-start gap-4 hover:border-white/10 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className={`font-display text-2xl ${valueClass || color}`}>{value}</p>
      </div>
    </div>
  )

  const FinancialCard = ({ icon: Icon, label, value }) => (
    <div className="bg-card border border-white/5 rounded-xl p-5 flex items-start gap-4 hover:border-white/10 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className="font-display text-2xl text-cream">
          {unlocked ? value : <span className="tracking-widest text-muted">●●●●●●</span>}
        </p>
      </div>
      <button
        onClick={() => unlocked ? setUnlocked(false) : setShowPin(true)}
        className="text-muted hover:text-accent transition-colors mt-1"
        title={unlocked ? 'Ocultar' : 'Mostrar'}
      >
        {unlocked ? <EyeSlashIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={CubeIcon} label="Productos" value={total} color="text-accent" />
        <StatCard icon={ArchiveBoxIcon} label="Unidades" value={totalUnits} color="text-cream" />
        <StatCard
          icon={ExclamationCircleIcon}
          label="Sin stock"
          value={outOfStock}
          color="text-danger"
          valueClass={outOfStock > 0 ? 'text-danger' : 'text-cream'}
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Stock bajo"
          value={lowStock}
          color="text-warning"
          valueClass={lowStock > 0 ? 'text-warning' : 'text-cream'}
        />
        <FinancialCard icon={BanknotesIcon} label="Valor al costo" value={formatARS(costValue)} />
        <FinancialCard icon={ShoppingBagIcon} label="Valor retail" value={formatARS(saleValue)} />
      </div>

      {showPin && (
        <PinModal onSuccess={() => setUnlocked(true)} onClose={() => setShowPin(false)} />
      )}
    </>
  )
}
