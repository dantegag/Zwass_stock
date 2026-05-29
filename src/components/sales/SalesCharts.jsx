import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatMoney } from '../../lib/formatCurrency'

function dayKey(d) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit',
  }).format(d)
}

function buildDailySeries(active, currency, dateRange) {
  const map = new Map()
  const start = new Date(dateRange.from)
  const end = new Date(dateRange.to)
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  while (cur <= end) {
    map.set(dayKey(cur), { day: dayKey(cur), total: 0 })
    cur.setDate(cur.getDate() + 1)
  }
  for (const s of active) {
    if (s.currency !== currency) continue
    const k = dayKey(new Date(s.sold_at))
    if (map.has(k)) map.get(k).total += Number(s.total_price || 0)
  }
  return Array.from(map.values())
}

const CURRENCY_META = {
  ARS: { label: 'Ventas ARS por día',     color: '#c9a96e' },
  USD: { label: 'Ventas USD por día',     color: '#4a9e6b' },
  EUR: { label: 'Ventas EUR por día',     color: '#5a8aaa' },
}

function DailyChart({ data, currency }) {
  const meta = CURRENCY_META[currency]
  return (
    <div className="bg-card border border-white/5 rounded-xl p-4">
      <p className="text-muted text-xs uppercase tracking-wider mb-3">{meta.label}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" stroke="#8a8278" tick={{ fontSize: 10 }} />
            <YAxis
              stroke="#8a8278"
              tick={{ fontSize: 10 }}
              tickFormatter={v => (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              contentStyle={{ background: '#1a1917', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }}
              formatter={(v) => formatMoney(v, currency)}
            />
            <Bar dataKey="total" fill={meta.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function SalesCharts({ sales, dateRange }) {
  const active = useMemo(() => sales.filter(s => !s.voided_at), [sales])
  const arsData = useMemo(() => buildDailySeries(active, 'ARS', dateRange), [active, dateRange])
  const usdData = useMemo(() => buildDailySeries(active, 'USD', dateRange), [active, dateRange])
  const eurData = useMemo(() => buildDailySeries(active, 'EUR', dateRange), [active, dateRange])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <DailyChart data={arsData} currency="ARS" />
      <DailyChart data={usdData} currency="USD" />
      <DailyChart data={eurData} currency="EUR" />
    </div>
  )
}
