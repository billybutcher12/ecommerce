import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color: string;
  size: string;
  created_at?: string;
  updated_at?: string;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  loadCart: (userId: string) => Promise<void>;
  addToCart: (item: Omit<CartItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  removeFromCart: (product_id: string, color: string, size: string) => Promise<void>;
  updateQuantity: (product_id: string, color: string, size: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,
      subtotal: 0,

      loadCart: async (userId: string) => {
        console.log('[useCart] loadCart userId:', userId);
        set({ items: [], itemCount: 0, subtotal: 0 });
        const { data: items, error } = await supabase
          .from('user_cart_items')
          .select('*')
          .eq('user_id', userId);
        if (error) {
          console.error('[useCart] loadCart error:', error);
        }
        const safeItems = Array.isArray(items) ? items : [];
        const itemCount = safeItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = safeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        set({ items: safeItems, itemCount, subtotal });
        console.log('[useCart] loadCart result:', safeItems);
      },

      addToCart: async (item) => {
        const userId = localStorage.getItem('sb-user-id');
        console.log('[useCart] addToCart userId:', userId, 'item:', item);
        if (!userId) return;
        const { data: existing, error: existError } = await supabase
          .from('user_cart_items')
          .select('*')
          .eq('user_id', userId)
          .eq('product_id', item.product_id)
          .eq('color', item.color)
          .eq('size', item.size)
          .single();
        if (existError) console.error('[useCart] addToCart check exist error:', existError);
        if (existing) {
          const { error: updateError } = await supabase
            .from('user_cart_items')
            .update({ quantity: existing.quantity + item.quantity })
            .eq('id', existing.id);
          if (updateError) console.error('[useCart] addToCart update error:', updateError);
        } else {
          const { error: insertError } = await supabase
            .from('user_cart_items')
            .insert({
              user_id: userId,
              product_id: item.product_id,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: item.quantity,
              color: item.color,
              size: item.size
            });
          if (insertError) console.error('[useCart] addToCart insert error:', insertError);
        }
        await get().loadCart(userId);
      },

      removeFromCart: async (product_id, color, size) => {
        const userId = localStorage.getItem('sb-user-id');
        console.log('[useCart] removeFromCart userId:', userId, 'product_id:', product_id, 'color:', color, 'size:', size);
        if (!userId) return;
        const { error } = await supabase
          .from('user_cart_items')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', product_id)
          .eq('color', color)
          .eq('size', size);
        if (error) console.error('[useCart] removeFromCart error:', error);
        await get().loadCart(userId);
      },

      updateQuantity: async (product_id, color, size, quantity) => {
        const userId = localStorage.getItem('sb-user-id');
        console.log('[useCart] updateQuantity userId:', userId, 'product_id:', product_id, 'color:', color, 'size:', size, 'quantity:', quantity);
        if (!userId) return;
        const { error } = await supabase
          .from('user_cart_items')
          .update({ quantity })
          .eq('user_id', userId)
          .eq('product_id', product_id)
          .eq('color', color)
          .eq('size', size);
        if (error) console.error('[useCart] updateQuantity error:', error);
        await get().loadCart(userId);
      },

      clearCart: async () => {
        const userId = localStorage.getItem('sb-user-id');
        if (!userId) {
          set({ items: [], itemCount: 0, subtotal: 0 });
          return;
        }
        await supabase
          .from('user_cart_items')
          .delete()
          .eq('user_id', userId);
        set({ items: [], itemCount: 0, subtotal: 0 });
      },
    }),
    {
      name: 'shopping-cart',
    }
  )
);