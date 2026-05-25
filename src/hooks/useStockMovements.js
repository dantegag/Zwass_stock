import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStockMovements(productId) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchMovements = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50)
    setMovements(data || [])
    setLoading(false)
  }, [productId])

  return { movements, loading, fetchMovements }
}
