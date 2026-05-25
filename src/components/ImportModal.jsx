import { useState, useRef } from 'react'
import { XMarkIcon, ArrowUpTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { parseFile, mapRows } from '../lib/parseExcel'

const APP_FIELDS = [
  { key: 'name', label: 'Nombre *' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Categoría' },
  { key: 'color', label: 'Color' },
  { key: 'size', label: 'Talle' },
  { key: 'cost_price', label: 'Precio Costo' },
  { key: 'sale_price', label: 'Precio Venta' },
  { key: 'quantity', label: 'Cantidad' },
  { key: 'notes', label: 'Notas' },
]

function autoDetect(headers) {
  const map = {}
  const HINTS = {
    name: ['nombre','name','producto','descripcion','description'],
    sku: ['sku','codigo','code','ref','referencia'],
    category: ['categoria','category','tipo','type'],
    color: ['color','colour'],
    size: ['talle','size','talla','medida','numero'],
    cost_price: ['costo','cost','precio costo','precio_costo','p. costo'],
    sale_price: ['venta','sale','precio venta','precio_venta','precio','price'],
    quantity: ['cantidad','qty','stock','unidades','quantity'],
    notes: ['notas','notes','observaciones','comentarios'],
  }
  for (const [field, hints] of Object.entries(HINTS)) {
    const match = headers.find(h => hints.includes(h.toLowerCase().trim()))
    if (match) map[field] = match
  }
  return map
}

export default function ImportModal({ onImport, onClose }) {
  const [step, setStep] = useState('upload')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [columnMap, setColumnMap] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    try {
      const { headers: h, rows: r } = await parseFile(file)
      setHeaders(h)
      setRows(r)
      setColumnMap(autoDetect(h))
      setStep('map')
    } catch (err) {
      alert('Error al leer el archivo: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    setLoading(true)
    const mapped = mapRows(rows, columnMap)
    try {
      const res = await onImport(mapped)
      setResult(res)
      setStep('result')
    } catch (err) {
      alert('Error al importar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const previewRows = rows.slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-2xl text-cream">Importar Excel</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
                dragOver ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <ArrowUpTrayIcon className="w-10 h-10 text-muted" />
              <div className="text-center">
                <p className="text-cream font-medium">Arrastrá tu archivo aquí</p>
                <p className="text-muted text-sm mt-1">o hacé clic para seleccionar</p>
                <p className="text-muted text-xs mt-2">.xlsx, .xls, .csv</p>
              </div>
              {loading && <p className="text-accent text-sm">Procesando...</p>}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
          )}

          {step === 'map' && (
            <div className="flex flex-col gap-5">
              <p className="text-muted text-sm">{rows.length} filas detectadas. Mapeá las columnas de tu archivo a los campos de la aplicación:</p>

              <div className="grid grid-cols-2 gap-3">
                {APP_FIELDS.map(f => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-xs text-muted uppercase tracking-wider">{f.label}</label>
                    <select
                      value={columnMap[f.key] || ''}
                      onChange={e => setColumnMap(m => ({ ...m, [f.key]: e.target.value || undefined }))}
                      className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
                    >
                      <option value="">— No importar —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-2">Vista previa (primeras 10 filas)</p>
                <div className="overflow-x-auto border border-white/5 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-surface/50">
                      <tr>
                        {APP_FIELDS.filter(f => columnMap[f.key]).map(f => (
                          <th key={f.key} className="px-3 py-2 text-left text-muted uppercase tracking-wider">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewRows.map((row, i) => (
                        <tr key={i} className="hover:bg-white/2">
                          {APP_FIELDS.filter(f => columnMap[f.key]).map(f => (
                            <td key={f.key} className="px-3 py-2 text-cream truncate max-w-32">{row[columnMap[f.key]] ?? '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="flex flex-col items-center gap-6 py-6">
              <CheckCircleIcon className="w-14 h-14 text-success" />
              <h3 className="font-display text-2xl text-cream">Importación completada</h3>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                <div className="bg-surface rounded-xl p-4 text-center border border-white/5">
                  <p className="text-2xl font-display text-success">{result.imported}</p>
                  <p className="text-muted text-xs mt-1">Importados</p>
                </div>
                <div className="bg-surface rounded-xl p-4 text-center border border-white/5">
                  <p className="text-2xl font-display text-accent">{result.updated}</p>
                  <p className="text-muted text-xs mt-1">Actualizados</p>
                </div>
                <div className="bg-surface rounded-xl p-4 text-center border border-white/5">
                  <p className={`text-2xl font-display ${result.errors > 0 ? 'text-danger' : 'text-muted'}`}>{result.errors}</p>
                  <p className="text-muted text-xs mt-1">Errores</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
          >
            {step === 'result' ? 'Cerrar' : 'Cancelar'}
          </button>
          {step === 'map' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
              >
                Cambiar archivo
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !columnMap.name}
                className="px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm disabled:opacity-50"
              >
                {loading ? 'Importando...' : `Confirmar importación (${rows.length} filas)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
