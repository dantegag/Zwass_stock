import { useState, useMemo, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function ProductPicker({ products, onSelect }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return products.slice(0, 50)
    const term = q.toLowerCase()
    return products.filter(p =>
      [p.name, p.sku, p.color, p.notes].some(v => v?.toLowerCase().includes(term))
    ).slice(0, 50)
  }, [products, q])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, SKU o color..."
          className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-cream placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">No se encontraron productos</p>
        ) : filtered.map(p => {
          const out = (p.quantity || 0) === 0
          return (
            <button
              key={p.id}
              onClick={() => !out && onSelect(p)}
              disabled={out}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors text-left ${
                out
                  ? 'border-white/5 opacity-40 cursor-not-allowed'
                  : 'border-white/10 hover:border-accent/40 hover:bg-white/2'
              }`}
            >
              <div className="min-w-0">
                <p className="text-cream font-medium truncate">{p.name}</p>
                <p className="text-muted text-xs mt-0.5">
                  {p.sku || '—'}{p.color ? ` · ${p.color}` : ''}{p.size ? ` · ${p.size}` : ''}
                </p>
              </div>
              <div className="text-right text-xs">
                {out ? (
                  <span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/20 whitespace-nowrap">Agotado</span>
                ) : (
                  <span className="text-muted">Stock: <span className="text-cream font-mono">{p.quantity}</span></span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
