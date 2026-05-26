import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchSales)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchSales])

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

  return { sales, loading, error, fetchSales, registerSale, voidSale }
}
