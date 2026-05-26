import { useState } from 'react'
import { XMarkIcon, PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'

export default function StockMovementModal({ product, type, onSave, onClose }) {
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdd = type === 'add'
  const maxRemove = product?.quantity ?? 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    const n = parseInt(qty, 10)
    if (!n || n <= 0) { setError('Ingresá una cantidad válida'); return }
    if (!isAdd && n > maxRemove) { setError(`No podés retirar más de ${maxRemove} unidades`); return }
    setSaving(true)
    try {
      await onSave(product, type, n, note.trim())
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {isAdd
              ? <PlusCircleIcon className="w-5 h-5 text-success" />
              : <MinusCircleIcon className="w-5 h-5 text-warning" />}
            <h2 className="font-display text-xl text-cream">
              {isAdd ? 'Agregar stock' : 'Retirar stock'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <p className="text-muted text-sm mb-5 truncate">
          <span className="text-cream">{product?.name}</span>
          {' — '}{isAdd ? 'Stock actual:' : 'Disponible:'} <span className="text-accent font-medium">{product?.quantity}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Cantidad</label>
            <input
              type="number"
              value={qty}
              onChange={e => { setQty(e.target.value); setError('') }}
              min={1}
              max={isAdd ? undefined : maxRemove}
              autoFocus
              className={`bg-surface border rounded-lg px-4 py-3 text-center text-2xl text-cream focus:outline-none focus:border-accent/50 transition-colors ${
                error ? 'border-danger' : 'border-white/10'
              }`}
            />
            {error && <span className="text-danger text-xs">{error}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Entrega de proveedor, venta al por mayor..."
              className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 ${
                isAdd ? 'bg-success text-white hover:bg-success/80' : 'bg-warning text-bg hover:bg-warning/80'
              }`}
            >
              {saving ? 'Guardando...' : isAdd ? 'Agregar' : 'Retirar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
