import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit_price: number;
  user_id: string;
}

interface Movement {
  id: string;
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  reason: string;
  notes?: string;
  user_id: string;
}

interface InventoryContextType {
  products: Product[];
  movements: Movement[];
  loading: boolean;
  fetchProducts: () => Promise<void>;
  fetchMovements: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'user_id'>) => Promise<void>;
  addMovement: (movement: Omit<Movement, 'id' | 'user_id'>) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) console.error('Erro ao buscar produtos:', error);
    else setProducts(data || []);
  }, []);

  const fetchMovements = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) console.error('Erro ao buscar movimentações:', error);
    else setMovements(data || []);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchMovements()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProducts, fetchMovements]);

  const addProduct = async (product: Omit<Product, 'id' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('products')
      .insert([{ ...product, user_id: user.id }]);

    if (error) throw error;
    await fetchProducts(); // Atualiza a lista automaticamente
  };

  const addMovement = async (movement: Omit<Movement, 'id' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 1. Registrar a movimentação
    const { error: moveError } = await supabase
      .from('movements')
      .insert([{ ...movement, user_id: user.id }]);

    if (moveError) throw moveError;

    // 2. Atualizar a quantidade no produto
    const product = products.find(p => p.id === movement.product_id);
    if (product) {
      const newQuantity = movement.type === 'in' 
        ? product.quantity + movement.quantity 
        : product.quantity - movement.quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', product.id);

      if (updateError) console.error('Erro ao atualizar estoque:', updateError);
    }

    // 3. Recarregar dados para refletir no front-end
    await Promise.all([fetchProducts(), fetchMovements()]);
  };

  return (
    <InventoryContext.Provider value={{ 
      products, 
      movements, 
      loading, 
      fetchProducts, 
      fetchMovements, 
      addProduct, 
      addMovement 
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory deve ser usado dentro de um InventoryProvider');
  }
  return context;
}
