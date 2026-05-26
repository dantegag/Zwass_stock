import { useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

const METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const fmtDate = (d) => new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(d)

const fmtDateTime = (d) => new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}).format(d)

export default function PrintableSummary({ sales, from, to }) {
  const { matrix, totals } = useMemo(() => {
    const active = sales.filter(s => !s.voided_at)
    const result = {}
    for (const m of METHODS) result[m] = { ARS: 0, USD: 0, EUR: 0 }
    const t = { ARS: 0, USD: 0, EUR: 0 }
    for (const s of active) {
      const row = result[s.payment_method]
      if (!row) continue
      row[s.currency] += Number(s.total_price || 0)
      t[s.currency] += Number(s.total_price || 0)
    }
    return { matrix: result, totals: t }
  }, [sales])

  return (
    <div className="print-only" style={{ padding: 24, fontFamily: 'monospace', color: 'black' }}>
      <div style={{ borderTop: '2px dotted black', borderBottom: '2px dotted black', padding: '12px 0', textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 24, margin: 0 }}>ZWASS — RESUMEN DE CAJA</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Período: {fmtDate(from)} – {fmtDate(to)}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid black' }}>
            <th style={{ textAlign: 'left', padding: 4 }}>Método de pago</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Pesos</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Dólares</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Euros</th>
          </tr>
        </thead>
        <tbody>
          {METHODS.map(m => (
            <tr key={m}>
              <td style={{ padding: 4 }}>{m}</td>
              <td style={{ padding: 4, textAlign: 'right' }}>{matrix[m].ARS > 0 ? formatMoney(matrix[m].ARS, 'ARS') : '—'}</td>
              <td style={{ padding: 4, textAlign: 'right' }}>{matrix[m].USD > 0 ? formatMoney(matrix[m].USD, 'USD') : '—'}</td>
              <td style={{ padding: 4, textAlign: 'right' }}>{matrix[m].EUR > 0 ? formatMoney(matrix[m].EUR, 'EUR') : '—'}</td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid black', fontWeight: 'bold' }}>
            <td style={{ padding: 4 }}>VENTA TOTAL</td>
            <td style={{ padding: 4, textAlign: 'right' }}>{formatMoney(totals.ARS, 'ARS')}</td>
            <td style={{ padding: 4, textAlign: 'right' }}>{formatMoney(totals.USD, 'USD')}</td>
            <td style={{ padding: 4, textAlign: 'right' }}>{formatMoney(totals.EUR, 'EUR')}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: '2px dotted black', textAlign: 'center', padding: '12px 0', marginTop: 16, fontSize: 10 }}>
        Impreso {fmtDateTime(new Date())}
      </div>
    </div>
  )
}
