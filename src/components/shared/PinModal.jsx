import { useState } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'

const CORRECT_PIN = '2024'

export default function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      onSuccess()
      onClose()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <LockClosedIcon className="w-6 h-6 text-accent" />
          </div>
          <h2 className="font-display text-2xl text-cream">Acceso restringido</h2>
          <p className="text-muted text-sm text-center">Ingresá el PIN para ver los valores financieros</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false) }}
            placeholder="••••"
            maxLength={8}
            autoFocus
            className={`w-full bg-surface border rounded-lg px-4 py-3 text-center text-2xl tracking-widest text-cream focus:outline-none focus:border-accent transition-colors ${
              error ? 'border-danger' : 'border-white/10'
            }`}
          />
          {error && <p className="text-danger text-sm text-center">PIN incorrecto</p>}

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
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
