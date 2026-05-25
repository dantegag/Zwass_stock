import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function Header({ onAddProduct, onImport, onExport }) {
  return (
    <header className="border-b border-white/5 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex flex-col">
          <h1 className="font-display text-4xl font-light tracking-[0.25em] text-cream">
            ZWASS
          </h1>
          <span className="text-muted text-xs tracking-widest uppercase mt-0.5">Sistema de Stock</span>
        </div>

        {/* Accent line */}
        <div className="hidden md:block flex-1 mx-8 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 transition-all text-sm"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 transition-all text-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={onAddProduct}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-bg hover:bg-accent-dark transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Nuevo producto</span>
          </button>
        </div>
      </div>
    </header>
  )
}
