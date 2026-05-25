import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

const CATEGORIES = [
  'Bolsos y Mochilas','Carteras','Camperas',
  'Morrales y Portafolios','Calzado','Billeteras',
  'Riñoneras','Cinturones','Accesorios','Pañuelos'
]

const EMPTY = {
  name: '', sku: '', category: '', color: '',
  size: '', cost_price: '', sale_price: '', quantity: 0, notes: ''
}

export default function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(product?.id)

  useEffect(() => {
    if (product) setForm({ ...EMPTY, ...product })
    else setForm(EMPTY)
  }, [product])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es requerido'
    if (form.quantity < 0) errs.quantity = 'La cantidad no puede ser negativa'
    if (form.cost_price !== '' && Number(form.cost_price) < 0) errs.cost_price = 'Precio inválido'
    if (form.sale_price !== '' && Number(form.sale_price) < 0) errs.sale_price = 'Precio inválido'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        cost_price: form.cost_price === '' ? 0 : Number(form.cost_price),
        sale_price: form.sale_price === '' ? 0 : Number(form.sale_price),
        quantity: Number(form.quantity),
        sku: form.sku || null,
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, field, type = 'text', placeholder = '', required = false }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted uppercase tracking-wider">
        {label}{required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={set(field)}
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        className={`bg-surface border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors ${
          errors[field] ? 'border-danger' : 'border-white/10'
        }`}
      />
      {errors[field] && <span className="text-danger text-xs">{errors[field]}</span>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-2xl text-cream">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Nombre" field="name" required placeholder="Cartera de cuero marrón" />
            </div>
            <Field label="SKU" field="sku" placeholder="ZW-CAR-001" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted uppercase tracking-wider">Categoría</label>
              <select
                value={form.category}
                onChange={set('category')}
                className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
              >
                <option value="">Sin categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Color" field="color" placeholder="Marrón cuero" />
            <Field label="Talle/Tamaño" field="size" placeholder="M, 38, Único..." />
            <Field label="Precio costo (ARS)" field="cost_price" type="number" placeholder="0" />
            <Field label="Precio venta (ARS)" field="sale_price" type="number" placeholder="0" />
            <Field label="Cantidad en stock" field="quantity" type="number" placeholder="0" />
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-muted uppercase tracking-wider">Notas</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Notas internas..."
                className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
            </div>
          </div>

          {errors.submit && (
            <p className="mt-3 text-danger text-sm text-center">{errors.submit}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
