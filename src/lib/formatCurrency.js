export function formatARS(value) {
  if (value == null || value === '') return '—'
  const num = Number(value)
  if (isNaN(num)) return '—'
  return '$' + Math.round(num).toLocaleString('es-AR').replace(/,/g, '.')
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const SYMBOLS = { ARS: '$', USD: 'U$S', EUR: '€' }

export function formatMoney(amount, currency = 'ARS') {
  const n = Number(amount) || 0
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
  if (currency === 'ARS') return `$${formatted}`
  return `${SYMBOLS[currency] || '$'} ${formatted}`
}
