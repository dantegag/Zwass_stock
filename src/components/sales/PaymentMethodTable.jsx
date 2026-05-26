import { useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

const METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

export default function PaymentMethodTable({ sales }) {
  const matrix = useMemo(() => {
    const active = sales.filter(s => !s.voided_at)
    const result = {}
    for (const m of METHODS) result[m] = { ARS: 0, USD: 0, EUR: 0 }
    const totals = { ARS: 0, USD: 0, EUR: 0 }
    for (const s of active) {
      const row = result[s.payment_method]
      if (!row) continue
      row[s.currency] = (row[s.currency] || 0) + Number(s.total_price || 0)
      totals[s.currency] = (totals[s.currency] || 0) + Number(s.total_price || 0)
    }
    return { result, totals }
  }, [sales])

  const Cell = ({ value, currency }) => (
    <td className="px-3 py-2 text-right tabular-nums">
      {value > 0
        ? <span className="text-cream">{formatMoney(value, currency)}</span>
        : <span className="text-muted">—</span>}
    </td>
  )

  return (
    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-white/5">
            <tr>
              <th className="px-3 py-3 text-left text-xs uppercase tracking-wider text-muted">Método de pago</th>
              <th className="px-3 py-3 text-right text-xs uppercase tracking-wider text-muted">Pesos</th>
              <th className="px-3 py-3 text-right text-xs uppercase tracking-wider text-muted">Dólares</th>
              <th className="px-3 py-3 text-right text-xs uppercase tracking-wider text-muted">Euros</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {METHODS.map(m => (
              <tr key={m} className="hover:bg-white/2">
                <td className="px-3 py-2 text-cream">{m}</td>
                <Cell value={matrix.result[m].ARS} currency="ARS" />
                <Cell value={matrix.result[m].USD} currency="USD" />
                <Cell value={matrix.result[m].EUR} currency="EUR" />
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface/70 border-t border-white/10">
            <tr>
              <td className="px-3 py-3 text-accent font-display text-lg">VENTA TOTAL</td>
              <td className="px-3 py-3 text-right text-accent font-display text-lg tabular-nums">{formatMoney(matrix.totals.ARS, 'ARS')}</td>
              <td className="px-3 py-3 text-right text-accent font-display text-lg tabular-nums">{formatMoney(matrix.totals.USD, 'USD')}</td>
              <td className="px-3 py-3 text-right text-accent font-display text-lg tabular-nums">{formatMoney(matrix.totals.EUR, 'EUR')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
