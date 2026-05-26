import { useMemo, useState } from 'react'
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import PaymentMethodTable from './PaymentMethodTable'
import SalesCharts from './SalesCharts'
import PrintableSummary from './PrintableSummary'
import { exportSalesSummary } from '../../lib/exportSalesSummary'

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function startOfWeek() {
  const d = startOfDay()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d
}
function startOfMonth() {
  const d = startOfDay()
  d.setDate(1)
  return d
}

export default function CashRegisterSummary({ sales }) {
  const [range, setRange] = useState('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [printing, setPrinting] = useState(false)

  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    let start
    if (range === 'today') start = startOfDay()
    else if (range === 'week') start = startOfWeek()
    else if (range === 'month') start = startOfMonth()
    else {
      start = from ? new Date(from) : new Date(0)
      return { startDate: start, endDate: to ? new Date(to + 'T23:59:59') : end }
    }
    return { startDate: start, endDate: end }
  }, [range, from, to])

  const filteredSales = useMemo(
    () => sales.filter(s => {
      const t = new Date(s.sold_at)
      return t >= startDate && t <= endDate
    }),
    [sales, startDate, endDate]
  )

  const handlePrint = () => {
    setPrinting(true)
    requestAnimationFrame(() => {
      window.print()
      setPrinting(false)
    })
  }

  const handleExport = () => {
    exportSalesSummary(filteredSales, { from: startDate, to: endDate })
  }

  const RangeBtn = ({ id, label }) => (
    <button
      onClick={() => setRange(id)}
      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
        range === id ? 'bg-accent text-bg border-accent' : 'border-white/10 text-muted hover:text-cream'
      }`}
    >{label}</button>
  )

  return (
    <>
      <div className="no-print flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            <RangeBtn id="today" label="Hoy" />
            <RangeBtn id="week" label="Esta semana" />
            <RangeBtn id="month" label="Este mes" />
            <RangeBtn id="custom" label="Personalizado" />
          </div>
          {range === 'custom' && (
            <div className="flex gap-2 items-center text-sm">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-cream" />
              <span className="text-muted">→</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-cream" />
            </div>
          )}
          <div className="sm:ml-auto flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 text-sm transition-colors">
              <PrinterIcon className="w-4 h-4" /> Imprimir resumen
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 text-sm transition-colors">
              <ArrowDownTrayIcon className="w-4 h-4" /> Exportar Excel
            </button>
          </div>
        </div>

        <PaymentMethodTable sales={filteredSales} />

        <SalesCharts sales={filteredSales} dateRange={{ from: startDate, to: endDate }} />
      </div>

      {printing && (
        <PrintableSummary sales={filteredSales} from={startDate} to={endDate} />
      )}
    </>
  )
}
