import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function RegisterSaleButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-6 py-3 rounded-xl bg-accent text-bg hover:bg-accent-dark transition-colors font-medium text-base shadow-lg"
    >
      <CurrencyDollarIcon className="w-5 h-5" />
      <span>Registrar Venta</span>
    </button>
  )
}
