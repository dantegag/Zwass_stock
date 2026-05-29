import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'test-data')
mkdirSync(outDir, { recursive: true })

// 10 ventas variadas: 3 monedas, 7 métodos de pago distintos, productos reales
// con SKU para que el trigger descuente stock automáticamente.
const rows = [
  {
    Producto: 'Bolso Cameron Negro',
    SKU: 'ZW-BOL-001',
    Categoria: 'Bolsos y Mochilas',
    Color: 'Negro',
    Talle: 'Único',
    Cantidad: 1,
    'Precio Unit.': 535000,
    Total: 535000,
    Moneda: 'ARS',
    'Método de Pago': 'Tarjeta Crédito',
    Nacionalidad: 'Arg',
    Notas: 'Venta presencial',
  },
  {
    Producto: 'Cartera Francesca Uva',
    SKU: 'ZW-CAR-001',
    Categoria: 'Carteras',
    Color: 'Uva',
    Talle: 'Mediano',
    Cantidad: 1,
    'Precio Unit.': 310000,
    Total: 310000,
    Moneda: 'ARS',
    'Método de Pago': 'Mercado Pago',
    Nacionalidad: 'Arg',
    Notas: '',
  },
  {
    Producto: 'Campera Fuelle Negra',
    SKU: 'ZW-CMP-001',
    Categoria: 'Camperas',
    Color: 'Negro',
    Talle: 'M',
    Cantidad: 1,
    'Precio Unit.': 775000,
    Total: 775000,
    Moneda: 'ARS',
    'Método de Pago': 'Transferencia',
    Nacionalidad: 'Arg',
    Notas: 'Cliente recurrente',
  },
  {
    Producto: 'Billetera Roma Negra',
    SKU: 'ZW-BIL-001',
    Categoria: 'Billeteras',
    Color: 'Negro',
    Talle: 'Único',
    Cantidad: 2,
    'Precio Unit.': 75000,
    Total: 150000,
    Moneda: 'ARS',
    'Método de Pago': 'Efectivo Pesos',
    Nacionalidad: 'Arg',
    Notas: 'Lleva 2',
  },
  {
    Producto: 'Cartera Francesca Negra',
    SKU: 'ZW-CAR-002',
    Categoria: 'Carteras',
    Color: 'Negro',
    Talle: 'Mediano',
    Cantidad: 1,
    'Precio Unit.': 310000,
    Total: 310000,
    Moneda: 'ARS',
    'Método de Pago': 'Cuenta Corriente',
    Nacionalidad: 'Arg',
    Notas: 'A cobrar fin de mes',
  },
  {
    Producto: 'Borcego Negro Con Cierre',
    SKU: 'ZW-CAL-001',
    Categoria: 'Calzado',
    Color: 'Negro',
    Talle: '42',
    Cantidad: 1,
    'Precio Unit.': 226000,
    Total: 226000,
    Moneda: 'ARS',
    'Método de Pago': 'Tarjeta Débito',
    Nacionalidad: 'Arg',
    Notas: '',
  },
  {
    Producto: 'Bolso Cameron Marrón',
    SKU: 'ZW-BOL-002',
    Categoria: 'Bolsos y Mochilas',
    Color: 'Marrón cuero',
    Talle: 'Único',
    Cantidad: 1,
    'Precio Unit.': 480,
    Total: 480,
    Moneda: 'USD',
    'Método de Pago': 'Efectivo Dólares',
    Nacionalidad: 'Extranjero',
    Notas: 'Turista USA',
  },
  {
    Producto: 'Campera Trucker Suede',
    SKU: 'ZW-CMP-TRK-01',
    Categoria: 'Camperas',
    Color: 'Camel',
    Talle: 'M',
    Cantidad: 1,
    'Precio Unit.': 780,
    Total: 780,
    Moneda: 'USD',
    'Método de Pago': 'Efectivo Dólares',
    Nacionalidad: 'Extranjero',
    Notas: '',
  },
  {
    Producto: 'Billetera Milano Camel',
    SKU: 'ZW-BIL-002',
    Categoria: 'Billeteras',
    Color: 'Camel',
    Talle: 'Único',
    Cantidad: 1,
    'Precio Unit.': 75,
    Total: 75,
    Moneda: 'EUR',
    'Método de Pago': 'Efectivo Euros',
    Nacionalidad: 'Extranjero',
    Notas: 'Cliente alemán',
  },
  {
    Producto: 'Cartera Lola Camel',
    SKU: 'ZW-CAR-003',
    Categoria: 'Carteras',
    Color: 'Camel',
    Talle: 'Pequeño',
    Cantidad: 1,
    'Precio Unit.': 245000,
    Total: 245000,
    Moneda: 'ARS',
    'Método de Pago': 'Mercado Libre',
    Nacionalidad: 'Arg',
    Notas: 'Envío a domicilio',
  },
]

const ws = XLSX.utils.json_to_sheet(rows)
ws['!cols'] = [
  { wch: 30 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 10 },
  { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 22 },
  { wch: 13 }, { wch: 28 },
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Ventas')

const outPath = resolve(outDir, 'zwass-test-sales.xlsx')
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
writeFileSync(outPath, buf)

const totalArs = rows.filter(r => r.Moneda === 'ARS').reduce((s, r) => s + r.Total, 0)
const totalUsd = rows.filter(r => r.Moneda === 'USD').reduce((s, r) => s + r.Total, 0)
const totalEur = rows.filter(r => r.Moneda === 'EUR').reduce((s, r) => s + r.Total, 0)

console.log(`✓ Archivo generado: ${outPath}`)
console.log(`  ${rows.length} ventas`)
console.log(`  Total ARS: $${totalArs.toLocaleString('es-AR')}`)
console.log(`  Total USD: U$S ${totalUsd.toLocaleString('es-AR')}`)
console.log(`  Total EUR: € ${totalEur.toLocaleString('es-AR')}`)
