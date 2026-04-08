import { useEffect, useState, useCallback } from 'react'
import { supabase, Product, Movement } from '@/lib/supabase'

interface InventoryStats {
  totalProducts: number
  totalValue: number
  lowStockProducts: number
  totalQuantity: number
}

export function useInventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        setUserId(null)
        setProducts([])
        setMovements([])
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Load data
  useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const [{ data: productsData }, { data: movementsData }] = await Promise.all([
          supabase.from('products').select('*').eq('user_id', userId),
          supabase.from('movements').select('*').eq('user_id', userId).order('date', { ascending: false }),
        ])
        
        setProducts(productsData || [])
        setMovements(movementsData || [])
        setIsLoaded(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Subscribe to changes
    const productsSubscription = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` }, () => {
        loadData()
      })
      .subscribe()

    const movementsSubscription = supabase
      .channel('movements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements', filter: `user_id=eq.${userId}` }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      productsSubscription.unsubscribe()
      movementsSubscription.unsubscribe()
    }
  }, [userId])

  const addProduct = useCallback(
    async (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!userId) throw new Error('Usuário não autenticado')
      
      const { data, error } = await supabase
        .from('products')
        .insert([{ ...product, user_id: userId }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    [userId]
  )

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    []
  )

  const deleteProduct = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    []
  )

  const addMovement = useCallback(
    async (movement: Omit<Movement, 'id' | 'user_id' | 'created_at'>) => {
      if (!userId) throw new Error('Usuário não autenticado')
      
      const { data, error } = await supabase
        .from('movements')
        .insert([{ ...movement, user_id: userId }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    [userId]
  )

  const getStats = useCallback(
    async (): Promise<InventoryStats> => {
      if (!userId) return { totalProducts: 0, totalValue: 0, lowStockProducts: 0, totalQuantity: 0 }
      
      const lowStockCount = products.filter(p => p.quantity <= p.min_quantity).length
      const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0)
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0)

      return {
        totalProducts: products.length,
        totalValue,
        lowStockProducts: lowStockCount,
        totalQuantity,
      }
    },
    [userId, products]
  )

  return {
    products,
    movements,
    isLoaded,
    isLoading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    addMovement,
    getStats,
  }
}
