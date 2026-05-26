import { useState } from 'react'
import Header from '../shared/Header'
import RegisterSaleButton from './RegisterSaleButton'
import RegisterSaleModal from './RegisterSaleModal'
import SalesHistory from './SalesHistory'
import CashRegisterSummary from './CashRegisterSummary'
import { useProducts } from '../../hooks/useProducts'
import { useSales } from '../../hooks/useSales'

export default function SalesView() {
  const { products } = useProducts()
  const { sales, voidSale } = useSales()
  const [modalOpen, setModalOpen] = useState(false)
  const [subTab, setSubTab] = useState('history')

  return (
    <>
      <Header />

      <div className="flex flex-col items-center gap-6 mb-6">
        <RegisterSaleButton onClick={() => setModalOpen(true)} />
      </div>

      <div className="flex gap-1 border-b border-white/5 mb-6">
        <button
          onClick={() => setSubTab('history')}
          className={`px-4 py-2 text-sm tracking-wider uppercase border-b-2 transition-colors ${
            subTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-cream'
          }`}
        >
          Historial de Ventas
        </button>
        <button
          onClick={() => setSubTab('summary')}
          className={`px-4 py-2 text-sm tracking-wider uppercase border-b-2 transition-colors ${
            subTab === 'summary' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-cream'
          }`}
        >
          Resumen de Caja
        </button>
      </div>

      {subTab === 'history' && <SalesHistory sales={sales} onVoid={voidSale} />}
      {subTab === 'summary' && (
        <CashRegisterSummary
          sales={sales}
          onPrint={() => alert('Print en próxima tarea')}
          onExport={() => alert('Export en próxima tarea')}
        />
      )}

      {modalOpen && (
        <RegisterSaleModal
          products={products}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
