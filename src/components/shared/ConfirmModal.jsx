import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ConfirmModal({ title, message, onConfirm, onClose, danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-danger/10' : 'bg-accent/10'}`}>
            <ExclamationTriangleIcon className={`w-6 h-6 ${danger ? 'text-danger' : 'text-accent'}`} />
          </div>
          <h2 className="font-display text-xl text-cream text-center">{title}</h2>
          <p className="text-muted text-sm text-center">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
              danger ? 'bg-danger text-white hover:bg-danger/80' : 'bg-accent text-bg hover:bg-accent-dark'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
