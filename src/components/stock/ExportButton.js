import * as XLSX from 'xlsx'
import { formatDate } from '../../lib/formatCurrency'

export function exportToExcel(products) {
  const rows = products.map(p => ({
    'Nombre': p.name,
    'SKU': p.sku || '',
    'Categoría': p.category || '',
    'Color': p.color || '',
    'Talle': p.size || '',
    'Precio Costo': p.cost_price || 0,
    'Precio Venta': p.sale_price || 0,
    'Cantidad': p.quantity || 0,
    'Valor Total (costo)': (p.cost_price || 0) * (p.quantity || 0),
    'Estado': p.quantity === 0 ? 'Agotado' : p.quantity <= 3 ? 'Stock bajo' : 'En stock',
    'Notas': p.notes || '',
    'Creado': formatDate(p.created_at),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Stock')

  const date = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
  XLSX.writeFile(wb, `zwass-stock-${date}.xlsx`)
}
