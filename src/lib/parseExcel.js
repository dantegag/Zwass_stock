import * as XLSX from 'xlsx'

export async function parseFile(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  if (raw.length < 2) return { headers: [], rows: [] }

  const headers = raw[0].map(String)
  const rows = raw.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })

  return { headers, rows }
}

export function mapRows(rows, columnMap) {
  return rows
    .map(row => {
      const p = {}
      for (const [field, header] of Object.entries(columnMap)) {
        if (header && row[header] !== undefined) {
          p[field] = row[header]
        }
      }
      if (p.cost_price) p.cost_price = Number(String(p.cost_price).replace(/[^0-9.]/g, '')) || 0
      if (p.sale_price) p.sale_price = Number(String(p.sale_price).replace(/[^0-9.]/g, '')) || 0
      if (p.quantity !== undefined) p.quantity = parseInt(p.quantity, 10) || 0
      return p
    })
    .filter(p => p.name)
}
