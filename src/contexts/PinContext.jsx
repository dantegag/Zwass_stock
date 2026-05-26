import { createContext, useContext, useState } from 'react'
import PinModal from '../components/shared/PinModal'

const PinContext = createContext(null)

export function PinProvider({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  const requestUnlock = () => {
    if (unlocked) return
    setPinOpen(true)
  }
  const lock = () => setUnlocked(false)

  return (
    <PinContext.Provider value={{ unlocked, requestUnlock, lock }}>
      {children}
      {pinOpen && (
        <PinModal
          onSuccess={() => { setUnlocked(true); setPinOpen(false) }}
          onClose={() => setPinOpen(false)}
        />
      )}
    </PinContext.Provider>
  )
}

export function usePin() {
  const ctx = useContext(PinContext)
  if (!ctx) throw new Error('usePin must be used inside <PinProvider>')
  return ctx
}
