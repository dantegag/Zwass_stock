import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'test-data')
mkdirSync(outDir, { recursive: true })

// Mix: SKUs que YA existen (van a SUMAR stock) + SKUs nuevos + filas sin SKU
const rows = [
  // --- REPOSICIÓN (SKUs existentes — el quantity SE SUMA) ---
  {
    Nombre: 'Bolso Cameron Negro',
    SKU: 'ZW-BOL-001',
    Categoria: 'Bolsos y Mochilas',
    Color: 'Negro',
    Talle: 'Único',
    Costo: 215000,
    Precio: 535000,
    Cantidad: 20,
    Notas: 'REPOSICION - de 8 unidades pasa a 28 (8 + 20)',
  },
  {
    Nombre: 'Billetera Roma Negra',
    SKU: 'ZW-BIL-001',
    Categoria: 'Billeteras',
    Color: 'Negro',
    Talle: 'Único',
    Costo: 30000,
    Precio: 75000,
    Cantidad: 50,
    Notas: 'REPOSICION - de 25 unidades pasa a 75 (25 + 50)',
  },

  // --- NUEVOS (SKUs que no existen — INSERT) ---
  {
    Nombre: 'Bolso Aspen Edición Limitada',
    SKU: 'ZW-BOL-EDL-01',
    Categoria: 'Bolsos y Mochilas',
    Color: 'Cognac',
    Talle: 'Mediano',
    Costo: 250000,
    Precio: 620000,
    Cantidad: 5,
    Notas: 'Edición numerada 1-50',
  },
  {
    Nombre: 'Cartera Vintage Whisky',
    SKU: 'ZW-CAR-VTG-01',
    Categoria: 'Carteras',
    Color: 'Whisky',
    Talle: 'Grande',
    Costo: 140000,
    Precio: 350000,
    Cantidad: 8,
    Notas: 'Cuero envejecido a mano',
  },
  {
    Nombre: 'Campera Trucker Suede',
    SKU: 'ZW-CMP-TRK-01',
    Categoria: 'Camperas',
    Color: 'Camel',
    Talle: 'M',
    Costo: 340000,
    Precio: 850000,
    Cantidad: 3,
    Notas: 'Stock bajo desde el inicio',
  },
  {
    Nombre: 'Zapato Oxford Italiano',
    SKU: 'ZW-CAL-OXF-01',
    Categoria: 'Calzado',
    Color: 'Negro',
    Talle: '42',
    Costo: 145000,
    Precio: 365000,
    Cantidad: 4,
    Notas: 'Importado',
  },
  {
    Nombre: 'Morral Ejecutivo Slim',
    SKU: 'ZW-MRR-EXE-01',
    Categoria: 'Morrales y Portafolios',
    Color: 'Negro',
    Talle: 'Único',
    Costo: 175000,
    Precio: 440000,
    Cantidad: 6,
    Notas: '',
  },
  {
    Nombre: 'Riñonera Outdoor',
    SKU: 'ZW-RIN-OUT-01',
    Categoria: 'Riñoneras',
    Color: 'Verde militar',
    Talle: 'Único',
    Costo: 62000,
    Precio: 155000,
    Cantidad: 12,
    Notas: '',
  },
  {
    Nombre: 'Cinturón Clásico Hombre',
    SKU: 'ZW-CIN-CLA-01',
    Categoria: 'Cinturones',
    Color: 'Marrón',
    Talle: '105cm',
    Costo: 24000,
    Precio: 62000,
    Cantidad: 0,
    Notas: 'Cargar como agotado para probar estado',
  },
  {
    Nombre: 'Pañuelo Lana Cuadrillé',
    SKU: 'ZW-PAN-LAN-01',
    Categoria: 'Pañuelos',
    Color: 'Gris',
    Talle: '70x70cm',
    Costo: 28000,
    Precio: 72000,
    Cantidad: 9,
    Notas: 'Invierno 2026',
  },

  // --- SIN SKU (siempre INSERT, podría duplicar) ---
  {
    Nombre: 'Llavero Promocional',
    SKU: '',
    Categoria: 'Accesorios',
    Color: 'Negro',
    Talle: 'Único',
    Costo: 5000,
    Precio: 15000,
    Cantidad: 25,
    Notas: 'Sin SKU — probar comportamiento de inserción duplicada',
  },
  {
    Nombre: 'Tarjetero Promocional',
    SKU: '',
    Categoria: 'Billeteras',
    Color: 'Marrón',
    Talle: 'Único',
    Costo: 14000,
    Precio: 38000,
    Cantidad: 20,
    Notas: 'Sin SKU',
  },
]

const ws = XLSX.utils.json_to_sheet(rows)

// Ancho de columnas para que se vea legible al abrir
ws['!cols'] = [
  { wch: 32 }, { wch: 16 }, { wch: 24 }, { wch: 14 },
  { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Productos')

const outPath = resolve(outDir, 'zwass-test-import.xlsx')
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
writeFileSync(outPath, buf)

console.log(`✓ Archivo generado: ${outPath}`)
console.log(`  ${rows.length} filas (2 updates, 8 nuevos por SKU, 2 sin SKU)`)
