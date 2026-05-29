import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../lib/supabase'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const instanceId = useId()

  const fetchSales = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    else setSales(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSales()
    const channel = supabase
      .channel(`sales-realtime-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchSales)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchSales, instanceId])

  const registerSale = async (sale) => {
    const { data, error } = await supabase
      .from('sales')
      .insert([sale])
      .select()
      .single()
    if (error) throw error
    return data
  }

  const voidSale = async (id) => {
    const { error } = await supabase
      .from('sales')
      .update({ voided_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  // Bulk-import sales from a parsed Excel.
  // Behavior: each row becomes a sale dated NOW (today). If the row has a SKU
  // matching a live product, product_id is linked so the stock trigger fires
  // and decrements inventory; otherwise product_id stays null.
  const importMany = async (rows) => {
    let imported = 0, errors = 0
    const errorDetails = []

    // Lookup products once for SKU -> id mapping
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, category')
      .is('deleted_at', null)
    const bySku = new Map()
    for (const p of products || []) {
      if (p.sku) bySku.set(p.sku.toLowerCase(), p)
    }

    for (const raw of rows) {
      try {
        const sku = raw.sku?.toString().trim() || null
        const match = sku ? bySku.get(sku.toLowerCase()) : null
        const qty = parseInt(raw.quantity, 10) || 1
        const unitPrice = Number(String(raw.unit_price ?? '').replace(/[^0-9.]/g, '')) || 0
        const totalPrice = raw.total_price
          ? (Number(String(raw.total_price).replace(/[^0-9.]/g, '')) || 0)
          : qty * unitPrice

        const sale = {
          product_id: match?.id || null,
          product_name: (raw.product_name || match?.name || '').toString().trim(),
          sku: sku,
          category: match?.category || (raw.category?.toString().trim() || null),
          color: raw.color?.toString().trim() || null,
          size: raw.size?.toString().trim() || null,
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          payment_method: raw.payment_method?.toString().trim(),
          nationality: raw.nationality?.toString().trim() || 'Arg',
          currency: (raw.currency?.toString().trim().toUpperCase()) || 'ARS',
          notes: raw.notes?.toString().trim() || null,
        }
        if (!sale.product_name) throw new Error('Falta nombre del producto')
        if (!sale.payment_method) throw new Error('Falta método de pago')

        const { error } = await supabase.from('sales').insert([sale])
        if (error) throw error
        imported++
      } catch (err) {
        errors++
        errorDetails.push(`${raw.product_name || raw.sku || 'fila sin nombre'}: ${err.message}`)
      }
    }

    await fetchSales()
    return { imported, errors, errorDetails }
  }

  return { sales, loading, error, fetchSales, registerSale, voidSale, importMany }
}
