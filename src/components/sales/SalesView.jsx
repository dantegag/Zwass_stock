import { useState } from 'react'
import Header from '../shared/Header'
import RegisterSaleButton from './RegisterSaleButton'
import RegisterSaleModal from './RegisterSaleModal'
import { useProducts } from '../../hooks/useProducts'

export default function SalesView({ sales }) {
  const { products } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Header />

      <div className="flex flex-col items-center gap-6">
        <RegisterSaleButton onClick={() => setModalOpen(true)} />
        <p className="text-muted text-sm">{sales.length} ventas registradas</p>
      </div>

      {modalOpen && (
        <RegisterSaleModal
          products={products}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
