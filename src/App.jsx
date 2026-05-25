import { useState } from 'react'
import toast from 'react-hot-toast'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ProductTable from './components/ProductTable'
import ProductModal from './components/ProductModal'
import StockMovementModal from './components/StockMovementModal'
import MovementHistory from './components/MovementHistory'
import ImportModal from './components/ImportModal'
import ConfirmModal from './components/ConfirmModal'
import { exportToExcel } from './components/ExportButton'
import { useProducts } from './hooks/useProducts'

export default function App() {
  const { products, loading, addProduct, updateProduct, deleteProduct, adjustStock, upsertMany } = useProducts()

  const [productModal, setProductModal] = useState(null)
  const [stockModal, setStockModal] = useState(null)
  const [historyProduct, setHistoryProduct] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSaveProduct = async (data) => {
    if (data.id) {
      await updateProduct(data.id, data)
      toast.success('Producto actualizado')
    } else {
      await addProduct(data)
      toast.success('Producto creado')
    }
  }

  const handleDeleteProduct = async (product) => {
    await deleteProduct(product.id)
    toast.success('Producto eliminado')
  }

  const handleAdjustStock = async (product, type, qty, note) => {
    const newQty = await adjustStock(product, type, qty, note)
    if (newQty === 0) {
      toast(`⚠️ ${product.name} quedó sin stock`, { icon: null, duration: 4000 })
    } else if (newQty <= 3) {
      toast(`📦 Stock bajo en ${product.name}`, { icon: null, duration: 3000 })
    } else {
      toast.success(type === 'add' ? `+${qty} unidades agregadas` : `-${qty} unidades retiradas`)
    }
  }

  const handleImport = async (rows) => {
    return await upsertMany(rows)
  }

  return (
    <div className="min-h-screen bg-bg font-body">
      <Header
        onAddProduct={() => setProductModal('add')}
        onImport={() => setImportOpen(true)}
        onExport={() => exportToExcel(products)}
      />

      <main className="max-w-screen-xl mx-auto px-6 py-8 flex flex-col gap-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-muted text-sm">Cargando inventario...</p>
            </div>
          </div>
        ) : (
          <>
            <Dashboard products={products} />
            <ProductTable
              products={products}
              onEdit={p => setProductModal(p)}
              onDelete={p => setConfirmDelete(p)}
              onAddStock={p => setStockModal({ product: p, type: 'add' })}
              onRemoveStock={p => setStockModal({ product: p, type: 'remove' })}
              onShowHistory={p => setHistoryProduct(p)}
            />
          </>
        )}
      </main>

      {productModal !== null && (
        <ProductModal
          product={productModal === 'add' ? null : productModal}
          onSave={handleSaveProduct}
          onClose={() => setProductModal(null)}
        />
      )}

      {stockModal && (
        <StockMovementModal
          product={stockModal.product}
          type={stockModal.type}
          onSave={handleAdjustStock}
          onClose={() => setStockModal(null)}
        />
      )}

      {historyProduct && (
        <MovementHistory
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {importOpen && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Estás seguro? Esto eliminará "${confirmDelete.name}" y su historial de movimientos.`}
          danger
          onConfirm={() => handleDeleteProduct(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
