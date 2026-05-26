import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { PinProvider } from './contexts/PinContext'
import Nav from './components/shared/Nav'
import StockView from './components/stock/StockView'
import SalesView from './components/sales/SalesView'
import RegisterSaleModal from './components/sales/RegisterSaleModal'
import { useSales } from './hooks/useSales'
import { useProducts } from './hooks/useProducts'

export default function App() {
  const [tab, setTab] = useState('stock')
  const { sales } = useSales()
  const { products } = useProducts()
  const [saleModal, setSaleModal] = useState(null)

  return (
    <PinProvider>
      <div className="min-h-screen bg-bg font-body">
        <Nav activeTab={tab} onTabChange={setTab} sales={sales} />
        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
          {tab === 'stock'
            ? <StockView onSellProduct={p => setSaleModal({ preselected: p })} />
            : <SalesView onOpenSaleModal={() => setSaleModal({})} />
          }
        </main>
        {saleModal && (
          <RegisterSaleModal
            products={products}
            preselectedProduct={saleModal.preselected}
            onClose={() => setSaleModal(null)}
          />
        )}
        <Toaster position="bottom-right" />
      </div>
    </PinProvider>
  )
}
