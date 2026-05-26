import { useEffect } from 'react'
import { XMarkIcon, PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'
import { useStockMovements } from '../../hooks/useStockMovements'
import { formatDate } from '../../lib/formatCurrency'

export default function MovementHistory({ product, onClose }) {
  const { movements, loading, fetchMovements } = useStockMovements(product?.id)

  useEffect(() => { fetchMovements() }, [fetchMovements])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:w-96 h-[70vh] md:h-auto md:max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="font-display text-xl text-cream">Historial de movimientos</h2>
            <p className="text-muted text-xs mt-0.5 truncate max-w-64">{product?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-muted text-sm text-center py-8">Cargando...</p>
          ) : movements.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">Sin movimientos registrados</p>
          ) : (
            <div className="flex flex-col gap-3">
              {movements.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-surface/50 rounded-lg border border-white/5">
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    m.type === 'add' ? 'bg-success/10' : 'bg-warning/10'
                  }`}>
                    {m.type === 'add'
                      ? <PlusCircleIcon className="w-4 h-4 text-success" />
                      : <MinusCircleIcon className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${m.type === 'add' ? 'text-success' : 'text-warning'}`}>
                        {m.type === 'add' ? '+' : '-'}{m.quantity} unidades
                      </span>
                      <span className="text-muted text-xs shrink-0">{formatDate(m.created_at)}</span>
                    </div>
                    {m.note && <p className="text-muted text-xs mt-0.5 truncate">{m.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
