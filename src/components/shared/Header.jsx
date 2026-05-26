import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function Header({ onAddProduct, onImport, onExport }) {
  return (
    <header className="border-b border-white/5 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex flex-col min-w-0">
          <h1 className="font-display text-2xl sm:text-4xl font-light tracking-[0.2em] sm:tracking-[0.25em] text-cream">
            ZWASS
          </h1>
          <span className="hidden sm:block text-muted text-xs tracking-widest uppercase mt-0.5">Sistema de Stock</span>
        </div>

        {/* Accent line */}
        <div className="hidden lg:block flex-1 mx-8 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onImport && (
            <button
              onClick={onImport}
              aria-label="Importar"
              className="flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 transition-all text-sm"
            >
              <ArrowUpTrayIcon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Importar</span>
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              aria-label="Exportar"
              className="flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 transition-all text-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Exportar</span>
            </button>
          )}

          {onAddProduct && (
            <button
              onClick={onAddProduct}
              aria-label="Nuevo producto"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-accent text-bg hover:bg-accent-dark transition-colors text-sm font-medium whitespace-nowrap"
            >
              <PlusIcon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
