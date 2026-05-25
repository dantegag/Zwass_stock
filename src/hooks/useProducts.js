import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const BASE_QUERY = () =>
  supabase
    .from('products')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await BASE_QUERY()
    if (error) setError(error.message)
    else setProducts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()

    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchProducts])

  const addProduct = async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single()
    if (error) throw error
    return data
  }

  const updateProduct = async (id, updates) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const deleteProduct = async (id) => {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  const adjustStock = async (product, type, qty, note = '') => {
    const newQty = type === 'add'
      ? product.quantity + qty
      : product.quantity - qty

    if (newQty < 0) throw new Error('El stock no puede ser negativo')

    const [{ error: movErr }, { error: prodErr }] = await Promise.all([
      supabase.from('stock_movements').insert([{
        product_id: product.id,
        type,
        quantity: qty,
        note,
      }]),
      supabase.from('products').update({ quantity: newQty }).eq('id', product.id),
    ])

    if (movErr) throw movErr
    if (prodErr) throw prodErr

    return newQty
  }

  const upsertMany = async (rows) => {
    let imported = 0, updated = 0, errors = 0
    for (const row of rows) {
      try {
        if (row.sku) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', row.sku)
            .is('deleted_at', null)
            .single()
          if (existing) {
            await supabase.from('products').update(row).eq('id', existing.id)
            updated++
          } else {
            await supabase.from('products').insert([row])
            imported++
          }
        } else {
          await supabase.from('products').insert([row])
          imported++
        }
      } catch {
        errors++
      }
    }
    await fetchProducts()
    return { imported, updated, errors }
  }

  return { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct, adjustStock, upsertMany }
}
