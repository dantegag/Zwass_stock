import { useState, useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

const PAYMENT_METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const CURRENCIES = ['ARS', 'USD', 'EUR']
const NATIONALITIES = ['Arg', 'Extranjero']

export default function SaleDetailsForm({ product, submitting, onBack, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    color: product.color || '',
    size: product.size || '',
    quantity: 1,
    unit_price: product.sale_price || 0,
    payment_method: PAYMENT_METHODS[0],
    nationality: 'Arg',
    currency: 'ARS',
    notes: '',
  })
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm(f => ({ ...f, [field]: value }))
    setErrors(es => ({ ...es, [field]: undefined }))
  }

  const total = useMemo(
    () => (Number(form.quantity) || 0) * (Number(form.unit_price) || 0),
    [form.quantity, form.unit_price]
  )

  const validate = () => {
    const errs = {}
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) errs.quantity = 'Cantidad inválida'
    if (qty > (product.quantity || 0)) errs.quantity = `Stock disponible: ${product.quantity}`
    if (Number(form.unit_price) < 0) errs.unit_price = 'Precio inválido'
    if (!form.payment_method) errs.payment_method = 'Requerido'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit({
      ...form,
      quantity: Number(form.quantity),
      unit_price: Number(form.unit_price),
    })
  }

  const RadioGroup = ({ field, options }) => (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => set(field)(opt)}
          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
            form[field] === opt
              ? 'bg-accent text-bg border-accent'
              : 'border-white/10 text-muted hover:text-cream'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Product header */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 border border-white/5">
        <div className="min-w-0">
          <p className="text-cream font-medium truncate">{product.name}</p>
          <p className="text-muted text-xs mt-0.5">{product.sku || '—'}</p>
        </div>
        <div className="text-right text-xs">
          <p className="text-muted">Stock disponible</p>
          <p className="text-cream font-mono text-lg">{product.quantity}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Color</label>
          <input
            type="text"
            value={form.color}
            onChange={set('color')}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Talle</label>
          <input
            type="text"
            value={form.size}
            onChange={set('size')}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Cantidad</label>
          <input
            type="number"
            min={1}
            max={product.quantity}
            value={form.quantity}
            onChange={set('quantity')}
            className={`bg-surface border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors ${
              errors.quantity ? 'border-danger' : 'border-white/10'
            }`}
          />
          {errors.quantity && <span className="text-danger text-xs">{errors.quantity}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Precio unitario</label>
          <input
            type="number"
            min={0}
            value={form.unit_price}
            onChange={set('unit_price')}
            className={`bg-surface border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors ${
              errors.unit_price ? 'border-danger' : 'border-white/10'
            }`}
          />
          {errors.unit_price && <span className="text-danger text-xs">{errors.unit_price}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Moneda</label>
          <RadioGroup field="currency" options={CURRENCIES} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Nacionalidad</label>
          <RadioGroup field="nationality" options={NATIONALITIES} />
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Método de pago</label>
          <select
            value={form.payment_method}
            onChange={set('payment_method')}
            className={`bg-surface border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors ${
              errors.payment_method ? 'border-danger' : 'border-white/10'
            }`}
          >
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {errors.payment_method && <span className="text-danger text-xs">{errors.payment_method}</span>}
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Notas (opcional)</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={2}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />
        </div>
      </div>

      {/* Total + actions */}
      <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-muted text-xs uppercase tracking-wider">Total</p>
          <p className="font-display text-2xl text-cream">{formatMoney(total, form.currency)}</p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm">
              Volver
            </button>
          )}
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm disabled:opacity-50"
          >
            {submitting ? 'Registrando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </form>
  )
}
