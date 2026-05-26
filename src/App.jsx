import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { PinProvider } from './contexts/PinContext'
import Nav from './components/shared/Nav'
import StockView from './components/stock/StockView'
import SalesView from './components/sales/SalesView'
import { useSales } from './hooks/useSales'

export default function App() {
  const [tab, setTab] = useState('stock')
  const { sales } = useSales()

  return (
    <PinProvider>
      <div className="min-h-screen bg-bg font-body">
        <Nav activeTab={tab} onTabChange={setTab} sales={sales} />
        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
          {tab === 'stock' ? <StockView /> : <SalesView />}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </PinProvider>
  )
}
