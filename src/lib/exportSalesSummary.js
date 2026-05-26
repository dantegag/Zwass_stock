import * as XLSX from 'xlsx'

const METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const fmtDate = (d) => new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(d).replace(/\//g, '-')

export function exportSalesSummary(sales, { from, to }) {
  const active = sales.filter(s => !s.voided_at)

  // Sheet 1: Resumen
  const matrix = {}
  for (const m of METHODS) matrix[m] = { ARS: 0, USD: 0, EUR: 0 }
  const totals = { ARS: 0, USD: 0, EUR: 0 }
  for (const s of active) {
    if (!matrix[s.payment_method]) continue
    matrix[s.payment_method][s.currency] += Number(s.total_price || 0)
    totals[s.currency] += Number(s.total_price || 0)
  }

  const resumenRows = [
    ['Método de pago', 'Pesos', 'Dólares', 'Euros'],
    ...METHODS.map(m => [m, matrix[m].ARS, matrix[m].USD, matrix[m].EUR]),
    ['VENTA TOTAL', totals.ARS, totals.USD, totals.EUR],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows)
  wsResumen['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]

  // Sheet 2: Detalle
  const detalleRows = [
    ['N° Factura','Fecha','Producto','SKU','Color','Talle','Cantidad','P. Unit.','Total','Moneda','Método','Nacionalidad','Notas'],
    ...active.map(s => [
      s.invoice_number,
      s.sold_at,
      s.product_name,
      s.sku || '',
      s.color || '',
      s.size || '',
      s.quantity,
      s.unit_price,
      s.total_price,
      s.currency,
      s.payment_method,
      s.nationality,
      s.notes || '',
    ]),
  ]
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows)
  wsDetalle['!cols'] = [
    { wch: 18 },{ wch: 22 },{ wch: 28 },{ wch: 14 },{ wch: 14 },
    { wch: 8 },{ wch: 8 },{ wch: 12 },{ wch: 12 },{ wch: 6 },
    { wch: 18 },{ wch: 12 },{ wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

  XLSX.writeFile(wb, `zwass-resumen-${fmtDate(from)}_${fmtDate(to)}.xlsx`)
}
