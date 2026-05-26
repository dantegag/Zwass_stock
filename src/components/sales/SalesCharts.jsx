import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatMoney } from '../../lib/formatCurrency'

const COLORS = ['#c9a96e','#a8863f','#4a9e6b','#c9893a','#b54545','#8a8278','#5a8aaa','#9a6ec9','#6ec9a9','#c9c46e']

function dayKey(d) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit',
  }).format(d)
}

export default function SalesCharts({ sales, dateRange }) {
  const active = useMemo(() => sales.filter(s => !s.voided_at), [sales])

  const dailyArs = useMemo(() => {
    const map = new Map()
    const start = new Date(dateRange.from)
    const end = new Date(dateRange.to)
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    while (cur <= end) {
      map.set(dayKey(cur), { day: dayKey(cur), ars: 0 })
      cur.setDate(cur.getDate() + 1)
    }
    for (const s of active) {
      if (s.currency !== 'ARS') continue
      const k = dayKey(new Date(s.sold_at))
      if (map.has(k)) map.get(k).ars += Number(s.total_price || 0)
    }
    return Array.from(map.values())
  }, [active, dateRange])

  const byMethod = useMemo(() => {
    const m = {}
    for (const s of active) {
      if (s.currency !== 'ARS') continue
      m[s.payment_method] = (m[s.payment_method] || 0) + Number(s.total_price || 0)
    }
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  }, [active])

  const topProducts = useMemo(() => {
    const m = {}
    for (const s of active) {
      const k = s.product_name
      m[k] = (m[k] || 0) + Number(s.quantity || 0)
    }
    return Object.entries(m)
      .map(([name, units]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, units }))
      .sort((a,b) => b.units - a.units)
      .slice(0, 5)
  }, [active])

  const Card = ({ title, children, hint }) => (
    <div className="bg-card border border-white/5 rounded-xl p-4">
      <p className="text-muted text-xs uppercase tracking-wider mb-1">{title}</p>
      {hint && <p className="text-muted text-[10px] mb-2">{hint}</p>}
      <div className="h-56">{children}</div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Ventas ARS por día" hint="USD/EUR no se incluyen para mantener una sola escala">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyArs}>
            <XAxis dataKey="day" stroke="#8a8278" tick={{ fontSize: 10 }} />
            <YAxis stroke="#8a8278" tick={{ fontSize: 10 }} tickFormatter={v => (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)} />
            <Tooltip
              contentStyle={{ background: '#1a1917', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }}
              formatter={(v) => formatMoney(v, 'ARS')}
            />
            <Bar dataKey="ars" fill="#c9a96e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="% por método de pago (ARS)" hint="Solo ARS">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
              {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1a1917', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }}
              formatter={(v) => formatMoney(v, 'ARS')}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: '#8a8278' }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top 5 productos (unidades)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProducts} layout="vertical">
            <XAxis type="number" stroke="#8a8278" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" stroke="#8a8278" tick={{ fontSize: 10 }} width={110} />
            <Tooltip contentStyle={{ background: '#1a1917', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }} />
            <Bar dataKey="units" fill="#4a9e6b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
