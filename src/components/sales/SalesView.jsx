import Header from '../shared/Header'

export default function SalesView({ sales }) {
  return (
    <>
      <Header />
      <div className="text-muted text-sm">
        SalesView placeholder — {sales.length} ventas en la base.
      </div>
    </>
  )
}
