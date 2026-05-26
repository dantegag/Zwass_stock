import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { MagnifyingGlassIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { formatMoney } from '../../lib/formatCurrency'
import ConfirmModal from '../shared/ConfirmModal'

const PAYMENT_METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const DT = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

export default function SalesHistory({ sales, onVoid }) {
  const [q, setQ] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [confirmVoid, setConfirmVoid] = useState(null)

  const filtered = useMemo(() => {
    let list = [...sales]
    if (q) {
      const term = q.toLowerCase()
      list = list.filter(s =>
        [s.invoice_number, s.product_name, s.sku, s.notes].some(v => v?.toLowerCase().includes(term))
      )
    }
    if (methodFilter) list = list.filter(s => s.payment_method === methodFilter)
    if (statusFilter === 'active') list = list.filter(s => !s.voided_at)
    else if (statusFilter === 'voided') list = list.filter(s => !!s.voided_at)
    return list
  }, [sales, q, methodFilter, statusFilter])

  const handleVoid = async (sale) => {
    try {
      await onVoid(sale.id)
      toast.success(`Venta ${sale.invoice_number} anulada — stock restaurado`)
    } catch (err) {
      toast.error('No se pudo anular: ' + err.message)
    }
  }

  return (
    <div className="bg-card border border-white/5 rounded-xl overflow-hidden w-full">
      {/* Filters */}
      <div className="p-3 sm:p-4 border-b border-white/5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por factura, producto, SKU..."
            className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-cream placeholder-muted focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="flex-1 sm:flex-initial bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50">
            <option value="">Todos los métodos</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 sm:flex-initial bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50">
            <option value="active">Activas</option>
            <option value="voided">Anuladas</option>
            <option value="all">Todas</option>
          </select>
        </div>
        <span className="text-xs text-muted sm:ml-auto">{filtered.length} resultados</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-white/5">
            <tr>
              {['N° Factura','Fecha','Artículo','Color','Talle','Cant.','P. Unit.','Total','Método','Acción'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs uppercase tracking-wider text-muted whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-muted">Sin ventas para mostrar</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className={`hover:bg-white/2 transition-colors ${s.voided_at ? 'opacity-50' : ''}`}>
                <td className="px-3 py-3 text-cream font-mono text-xs">{s.invoice_number}</td>
                <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">{DT.format(new Date(s.sold_at))}</td>
                <td className={`px-3 py-3 text-cream ${s.voided_at ? 'line-through' : ''} max-w-xs break-words`}>{s.product_name}</td>
                <td className="px-3 py-3 text-muted text-xs">{s.color || '—'}</td>
                <td className="px-3 py-3 text-muted text-xs">{s.size || '—'}</td>
                <td className="px-3 py-3 text-cream font-mono">{s.quantity}</td>
                <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">{formatMoney(s.unit_price, s.currency)}</td>
                <td className="px-3 py-3 text-cream font-medium whitespace-nowrap">{formatMoney(s.total_price, s.currency)}</td>
                <td className="px-3 py-3 text-muted text-xs">{s.payment_method}</td>
                <td className="px-3 py-3">
                  {s.voided_at ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-muted border border-white/10 whitespace-nowrap">Anulada</span>
                  ) : (
                    <button
                      onClick={() => setConfirmVoid(s)}
                      title="Anular venta"
                      className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-danger transition-colors"
                    >
                      <NoSymbolIcon className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-white/5">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted text-sm">Sin ventas para mostrar</div>
        ) : filtered.map(s => (
          <div key={s.id} className={`p-4 flex flex-col gap-2 ${s.voided_at ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-cream font-mono text-xs">{s.invoice_number}</span>
              <span className="text-muted text-xs">{DT.format(new Date(s.sold_at))}</span>
            </div>
            <p className={`text-cream font-medium ${s.voided_at ? 'line-through' : ''}`}>{s.product_name}</p>
            <div className="text-xs text-muted">
              {[s.color, s.size, `Cant: ${s.quantity}`].filter(Boolean).join(' · ')}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                <p className="text-muted text-[10px] uppercase tracking-wider">Total</p>
                <p className="text-cream font-medium">{formatMoney(s.total_price, s.currency)}</p>
                <p className="text-muted text-[11px]">{s.payment_method}</p>
              </div>
              {s.voided_at
                ? <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-muted border border-white/10">Anulada</span>
                : (
                  <button
                    onClick={() => setConfirmVoid(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-danger hover:border-danger/30 transition-colors text-xs"
                  >
                    <NoSymbolIcon className="w-4 h-4" /> Anular
                  </button>
                )
              }
            </div>
          </div>
        ))}
      </div>

      {confirmVoid && (
        <ConfirmModal
          title="Anular venta"
          message={`¿Anular la venta ${confirmVoid.invoice_number}? El stock de "${confirmVoid.product_name}" se restaurará y la venta se excluirá del Resumen de Caja.`}
          danger
          onConfirm={() => { handleVoid(confirmVoid); setConfirmVoid(null) }}
          onClose={() => setConfirmVoid(null)}
        />
      )}
    </div>
  )
}
