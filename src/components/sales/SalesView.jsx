import { useState } from 'react'
import toast from 'react-hot-toast'
import Header from '../shared/Header'
import RegisterSaleButton from './RegisterSaleButton'
import SalesHistory from './SalesHistory'
import CashRegisterSummary from './CashRegisterSummary'
import ImportSalesModal from './ImportSalesModal'
import { useSales } from '../../hooks/useSales'

export default function SalesView({ onOpenSaleModal }) {
  const { sales, voidSale, importMany } = useSales()
  const [subTab, setSubTab] = useState('history')
  const [importOpen, setImportOpen] = useState(false)

  const handleImport = async (rows) => {
    const res = await importMany(rows)
    if (res.imported > 0) {
      toast.success(`${res.imported} ventas importadas`)
    }
    if (res.errors > 0) {
      toast.error(`${res.errors} ventas con error`)
    }
    return res
  }

  return (
    <>
      <Header onImport={() => setImportOpen(true)} />

      <div className="flex flex-col items-center gap-6 mb-6">
        <RegisterSaleButton onClick={onOpenSaleModal} />
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
      {subTab === 'summary' && <CashRegisterSummary sales={sales} />}

      {importOpen && (
        <ImportSalesModal
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}
    </>
  )
}
