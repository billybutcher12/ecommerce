import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useWishlist() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]); // Lưu product_id
  const [loading, setLoading] = useState(false);

  // Lấy danh sách wishlist
  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('wishlists')
      .select('product_id')
      .eq('user_id', user.id);
    if (!error && data) {
      setWishlist(data.map((item: any) => item.product_id));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Thêm vào wishlist
  const addToWishlist = async (productId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('wishlists')
      .insert({ user_id: user.id, product_id: productId });
    if (!error) {
      setWishlist((prev) => [...prev, productId]);
    }
    return error;
  };

  // Xóa khỏi wishlist
  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);
    if (!error) {
      setWishlist((prev) => prev.filter((id) => id !== productId));
    }
    return error;
  };

  // Kiểm tra sản phẩm có trong wishlist không
  const isWishlisted = (productId: string) => wishlist.includes(productId);

  return { wishlist, loading, addToWishlist, removeFromWishlist, isWishlisted, fetchWishlist };
} 