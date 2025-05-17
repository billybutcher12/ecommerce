import React, { useState, useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function CartPage() {
  const { user } = useAuth();
  const { items, removeFromCart, loadCart, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadCart(user.id);
    }
  }, [user]);

  const handleSelectItem = (productId: string) => {
    setSelectedItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.product_id));
    }
  };

  const handleRemoveSelected = async () => {
    setIsLoading(true);
    try {
      await Promise.all(
        selectedItems.map((productId) => {
          const item = items.find((i) => i.product_id === productId);
          if (item) {
            return removeFromCart(item.product_id, item.color, item.size);
          }
          return null;
        })
      );
      setSelectedItems([]);
      toast.success('Đã xóa sản phẩm đã chọn khỏi giỏ hàng');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return items.reduce((total: number, item: import('../hooks/useCart').CartItem) => total + (item.price * item.quantity), 0);
  };

  if (items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16 min-h-[60vh] flex flex-col items-center justify-center"
      >
        <h1 className="text-4xl font-bold mb-8 text-primary-700 bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">Giỏ hàng</h1>
        <motion.div 
          className="text-center py-16"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <p className="text-gray-600 mb-4 text-lg">Giỏ hàng của bạn đang trống</p>
          <motion.a 
            href="/products" 
            className="inline-block px-8 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Tiếp tục mua sắm
          </motion.a>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 pt-24 pb-16 min-h-[60vh]"
    >
      <h1 className="text-4xl font-bold mb-12 text-primary-700 bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">Giỏ hàng</h1>
      <div className="mb-4 flex items-center gap-4">
        <input
          type="checkbox"
          checked={selectedItems.length === items.length}
          onChange={handleSelectAll}
          className="w-5 h-5 accent-primary-500"
        />
        <span className="font-semibold">Chọn tất cả</span>
        {selectedItems.length > 0 && (
          <motion.button
            onClick={handleRemoveSelected}
            className="ml-4 px-4 py-2 rounded-xl bg-red-100 text-red-700 font-bold shadow hover:bg-red-500 hover:text-white transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading}
          >
            Xóa đã chọn
          </motion.button>
        )}
        <motion.button
          onClick={clearCart}
          className="ml-4 px-4 py-2 rounded-xl bg-red-100 text-red-700 font-bold shadow hover:bg-red-500 hover:text-white transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          Xóa tất cả
        </motion.button>
      </div>
      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence>
        {items.map((item: import('../hooks/useCart').CartItem) => (
            <motion.div
              key={item.id + item.color + item.size}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              whileHover={{ 
                scale: 1.02,
                rotateX: 2,
                rotateY: 2,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                transition: { duration: 0.3 }
              }}
              style={{
                transformStyle: "preserve-3d",
                perspective: 1000
              }}
              className="flex flex-col md:flex-row items-center gap-8 p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <input
                type="checkbox"
                checked={selectedItems.includes(item.product_id)}
                onChange={() => handleSelectItem(item.product_id)}
                className="w-5 h-5 accent-primary-500 mb-4 md:mb-0"
              />
              <motion.div 
                className="relative"
                whileHover={{ 
                  scale: 1.1,
                  rotateY: 15,
                  z: 50
                }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-40 h-40 object-cover rounded-xl shadow-md border"
                />
              </motion.div>
              <div className="flex-1 w-full">
                <motion.h3 
                  className="text-xl md:text-2xl font-bold text-primary-700 mb-2"
                  whileHover={{ scale: 1.02, x: 5 }}
                >
                  {item.name}
                </motion.h3>
                <motion.p 
                  className="text-primary-600 font-semibold mb-2 text-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  {item.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                </motion.p>
                <p className="text-gray-500 text-sm mb-4">Màu: {item.color} | Size: {item.size}</p>
                <div className="flex items-center gap-4 mt-4">
                  <span className="w-12 text-center text-xl font-semibold">{item.quantity}</span>
                </div>
              </div>
              <motion.div 
                className="text-right min-w-[150px]"
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <p className="font-bold text-2xl text-primary-700">{(item.price * item.quantity).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 p-8 bg-white rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          whileHover={{
            scale: 1.02,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="text-2xl font-semibold text-gray-700">Tổng cộng:</div>
          <div className="text-3xl font-bold text-primary-700">{calculateTotal().toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
          <motion.a
            href="/checkout"
            className="px-10 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold shadow-lg text-xl hover:shadow-2xl transition-all duration-300"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            Thanh toán
          </motion.a>
        </motion.div>
      </div>
    </motion.div>
  );
}