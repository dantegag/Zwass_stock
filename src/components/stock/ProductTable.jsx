import { useState, useMemo } from 'react'
import {
  ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon,
  PencilIcon, TrashIcon, PlusCircleIcon, MinusCircleIcon,
  ClockIcon, MagnifyingGlassIcon, LockClosedIcon, EyeSlashIcon
} from '@heroicons/react/24/outline'
import { formatARS } from '../../lib/formatCurrency'
import { usePin } from '../../contexts/PinContext'

const CATEGORIES = [
  'Bolsos y Mochilas','Carteras','Camperas',
  'Morrales y Portafolios','Calzado','Billeteras',
  'Riñoneras','Cinturones','Accesorios','Pañuelos'
]
const PAGE_SIZE = 25

const StatusBadge = ({ qty }) => {
  const base = "inline-block px-2 py-0.5 rounded-full text-xs whitespace-nowrap border"
  if (qty === 0) return <span className={`${base} bg-danger/15 text-danger border-danger/20`}>Agotado</span>
  if (qty <= 3) return <span className={`${base} bg-warning/15 text-warning border-warning/20`}>Stock bajo</span>
  return <span className={`${base} bg-success/15 text-success border-success/20`}>En stock</span>
}

export default function ProductTable({ products, onEdit, onDelete, onAddStock, onRemoveStock, onShowHistory }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const { unlocked: pricesUnlocked, requestUnlock, lock } = usePin()

  const filtered = useMemo(() => {
    let list = [...products]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        [p.name, p.sku, p.color, p.notes].some(v => v?.toLowerCase().includes(q))
      )
    }
    if (categoryFilter) list = list.filter(p => p.category === categoryFilter)
    if (statusFilter === 'in_stock') list = list.filter(p => p.quantity > 3)
    else if (statusFilter === 'low') list = list.filter(p => p.quantity > 0 && p.quantity <= 3)
    else if (statusFilter === 'out') list = list.filter(p => p.quantity === 0)

    list.sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [products, search, categoryFilter, statusFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-muted" />
    return sortDir === 'asc'
      ? <ChevronUpIcon className="w-3.5 h-3.5 text-accent" />
      : <ChevronDownIcon className="w-3.5 h-3.5 text-accent" />
  }

  const Th = ({ col, label }) => (
    <th
      className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted cursor-pointer hover:text-cream select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">{label} <SortIcon col={col} /></span>
    </th>
  )

  return (
    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="p-3 sm:p-4 border-b border-white/5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre, SKU, color..."
            className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-cream placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex gap-2 sm:gap-3">
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
            className="flex-1 sm:flex-initial bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="flex-1 sm:flex-initial bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="in_stock">En stock</option>
            <option value="low">Stock bajo</option>
            <option value="out">Agotado</option>
          </select>
        </div>

        <div className="flex items-center justify-between sm:ml-auto gap-2 text-xs text-muted">
          <span>{filtered.length} resultados</span>
          <button
            onClick={() => pricesUnlocked ? lock() : requestUnlock()}
            className="flex items-center gap-1 px-2 py-1 rounded border border-white/10 hover:border-accent/40 hover:text-accent transition-colors"
            title={pricesUnlocked ? 'Ocultar precios' : 'Mostrar precios'}
          >
            {pricesUnlocked ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <LockClosedIcon className="w-3.5 h-3.5" />}
            {pricesUnlocked ? 'Ocultar precios' : 'Ver precios'}
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-white/5">
            <tr>
              <Th col="name" label="Nombre" />
              <Th col="sku" label="SKU" />
              <Th col="category" label="Categoría" />
              <Th col="color" label="Color" />
              <Th col="size" label="Talle" />
              {pricesUnlocked && <Th col="cost_price" label="P. Costo" />}
              {pricesUnlocked && <Th col="sale_price" label="P. Venta" />}
              <Th col="quantity" label="Stock" />
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted">Estado</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted">
                  No se encontraron productos
                </td>
              </tr>
            ) : paginated.map(p => (
              <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                <td className="px-4 py-3 text-cream font-medium max-w-xs break-words">{p.name}</td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{p.sku || '—'}</td>
                <td className="px-4 py-3 text-muted text-xs">{p.category || '—'}</td>
                <td className="px-4 py-3 text-muted text-xs">{p.color || '—'}</td>
                <td className="px-4 py-3 text-muted text-xs">{p.size || '—'}</td>
                {pricesUnlocked && <td className="px-4 py-3 text-muted text-xs">{formatARS(p.cost_price)}</td>}
                {pricesUnlocked && <td className="px-4 py-3 text-muted text-xs">{formatARS(p.sale_price)}</td>}
                <td className="px-4 py-3">
                  <span className={`font-mono font-medium ${
                    p.quantity === 0 ? 'text-danger' : p.quantity <= 3 ? 'text-warning' : 'text-cream'
                  }`}>{p.quantity}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge qty={p.quantity} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onShowHistory(p)} title="Historial" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-cream transition-colors">
                      <ClockIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onAddStock(p)} title="Agregar stock" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-success transition-colors">
                      <PlusCircleIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRemoveStock(p)} title="Retirar stock" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-warning transition-colors">
                      <MinusCircleIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(p)} title="Editar" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-accent transition-colors">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(p)} title="Eliminar" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-danger transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-white/5">
        {paginated.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted text-sm">
            No se encontraron productos
          </div>
        ) : paginated.map(p => (
          <div key={p.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-cream font-medium break-words">{p.name}</p>
                <p className="text-muted font-mono text-xs mt-0.5">{p.sku || '—'}</p>
              </div>
              <StatusBadge qty={p.quantity} />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {p.category && <span>{p.category}</span>}
              {p.color && <span>· {p.color}</span>}
              {p.size && <span>· Talle {p.size}</span>}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className={`font-mono text-2xl font-medium ${
                  p.quantity === 0 ? 'text-danger' : p.quantity <= 3 ? 'text-warning' : 'text-cream'
                }`}>{p.quantity}</span>
                <span className="text-muted text-xs uppercase tracking-wider">unidades</span>
              </div>

              {pricesUnlocked && (
                <div className="text-right text-xs">
                  <p className="text-muted">Venta</p>
                  <p className="text-cream font-medium">{formatARS(p.sale_price)}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 -mx-1 pt-1 border-t border-white/5">
              <button onClick={() => onAddStock(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded hover:bg-white/5 text-success transition-colors text-xs">
                <PlusCircleIcon className="w-4 h-4" /> Sumar
              </button>
              <button onClick={() => onRemoveStock(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded hover:bg-white/5 text-warning transition-colors text-xs">
                <MinusCircleIcon className="w-4 h-4" /> Retirar
              </button>
              <button onClick={() => onShowHistory(p)} aria-label="Historial" className="p-2 rounded hover:bg-white/5 text-muted hover:text-cream transition-colors">
                <ClockIcon className="w-4 h-4" />
              </button>
              <button onClick={() => onEdit(p)} aria-label="Editar" className="p-2 rounded hover:bg-white/5 text-muted hover:text-accent transition-colors">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(p)} aria-label="Eliminar" className="p-2 rounded hover:bg-white/5 text-muted hover:text-danger transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-muted">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:border-white/20 hover:text-cream transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:border-white/20 hover:text-cream transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
