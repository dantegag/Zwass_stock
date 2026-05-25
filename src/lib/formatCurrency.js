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
