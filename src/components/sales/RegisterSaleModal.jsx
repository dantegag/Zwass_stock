import { useState } from 'react'
import toast from 'react-hot-toast'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ProductPicker from './ProductPicker'
import SaleDetailsForm from './SaleDetailsForm'
import { useSales } from '../../hooks/useSales'
import { formatMoney } from '../../lib/formatCurrency'

export default function RegisterSaleModal({ products, preselectedProduct, onClose }) {
  const [step, setStep] = useState(preselectedProduct ? 'details' : 'picker')
  const [selected, setSelected] = useState(preselectedProduct || null)
  const { registerSale } = useSales()
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async (formData) => {
    setSubmitting(true)
    try {
      const sale = await registerSale({
        product_id: selected.id,
        product_name: selected.name,
        sku: selected.sku,
        category: selected.category,
        color: formData.color,
        size: formData.size,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        total_price: formData.quantity * formData.unit_price,
        payment_method: formData.payment_method,
        nationality: formData.nationality,
        currency: formData.currency,
        notes: formData.notes || null,
      })
      toast.success(
        `✓ Venta ${sale.invoice_number} · ${selected.name} · ${formData.payment_method} · ${formatMoney(sale.total_price, sale.currency)}`,
        { duration: 5000 }
      )
      const newStock = selected.quantity - formData.quantity
      if (newStock === 0) {
        toast(`⚠️ ${selected.name} quedó sin stock`, { icon: null, duration: 4000 })
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Error al registrar venta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-2xl text-cream">
            {step === 'picker' ? 'Seleccionar producto' : 'Detalles de la venta'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'picker' && (
            <ProductPicker
              products={products}
              onSelect={p => { setSelected(p); setStep('details') }}
            />
          )}
          {step === 'details' && selected && (
            <SaleDetailsForm
              product={selected}
              submitting={submitting}
              onBack={preselectedProduct ? null : () => setStep('picker')}
              onCancel={onClose}
              onSubmit={handleConfirm}
            />
          )}
        </div>
      </div>
    </div>
  )
}
