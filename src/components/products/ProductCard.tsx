import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { Database } from '../../lib/database.types';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../contexts/AuthContext';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
}

const ProductCard = ({ product, showAddToCart }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  // Lấy ảnh sản phẩm: ưu tiên image_urls[0], nếu không có thì lấy image_url, nếu vẫn không có thì dùng placeholder
  const imageUrl = Array.isArray(product.image_urls) && product.image_urls.length > 0
    ? product.image_urls[0]
    : (product.image_url || 'https://via.placeholder.com/400x600?text=No+Image');

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: imageUrl,
      quantity: 1,
      color: Array.isArray(product.colors) && product.colors.length > 0 ? product.colors[0] : '',
      size: Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes[0] : ''
    });
    toast.success(`${product.name} đã thêm vào giỏ hàng`);
  };
  
  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted 
      ? `${product.name} đã xóa khỏi yêu thích` 
      : `${product.name} đã thêm vào yêu thích`
    );
  };

  return (
    <Link to={`/products/${product.id}`} className="block group flex flex-col items-center bg-white rounded-2xl shadow-xl p-5 transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-rotate-2 hover:bg-gradient-to-br hover:from-purple-100 hover:to-blue-50 relative" style={{ perspective: '1000px', minHeight: 440 }}>
      {/* Product Image */}
      <div className="aspect-[3/4] w-full max-w-[220px] bg-secondary-100 relative overflow-hidden rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 mb-4 flex-shrink-0" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', transform: 'translateZ(0)' }}>
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Overlay ánh sáng động */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition duration-500">
          <div className="w-full h-full bg-gradient-to-tr from-white/30 to-transparent rounded-2xl blur-2xl"></div>
        </div>
      </div>
      {/* Product Info */}
      <h3 className="font-bold text-base md:text-lg text-primary-700 mb-1 text-center transition-colors group-hover:text-purple-600 line-clamp-2 min-h-[44px]">{product.name}</h3>
      <div className="text-lg md:text-xl font-extrabold text-primary-700 mb-1 text-center">{product.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
      <p className="text-sm text-secondary-600 line-clamp-2 mb-2 min-h-[36px] text-center">{product.description}</p>
      <div className="flex items-center justify-center space-x-2 min-h-[20px] mb-3">
        {Array.isArray(product.colors) && product.colors.length > 0 && product.colors.slice(0, 3).map((color, index) => (
          <span 
            key={index}
            className="w-4 h-4 rounded-full border-2 border-secondary-200 shadow-sm"
            style={{ 
              backgroundColor: 
                color.toLowerCase() === 'white' ? '#ffffff' :
                color.toLowerCase() === 'black' ? '#000000' :
                color.toLowerCase() === 'red' ? '#ef4444' :
                color.toLowerCase() === 'blue' ? '#3b82f6' :
                color.toLowerCase() === 'green' ? '#10b981' :
                color.toLowerCase() === 'yellow' ? '#eab308' :
                color.toLowerCase() === 'purple' ? '#8b5cf6' :
                color.toLowerCase() === 'pink' ? '#ec4899' :
                color.toLowerCase() === 'gray' ? '#6b7280' :
                color.toLowerCase() === 'brown' ? '#92400e' :
                color.toLowerCase() === 'navy' ? '#1e3a8a' :
                color.toLowerCase() === 'tan' ? '#d2b48c' :
                color.toLowerCase() === 'silver' ? '#c0c0c0' :
                color.toLowerCase() === 'gold' ? '#ffd700' :
                color.toLowerCase() === 'tortoise' ? '#704214' : '#cccccc'
            }}
            title={color}
          ></span>
        ))}
        {Array.isArray(product.colors) && product.colors.length > 3 && (
          <span className="text-xs text-secondary-500">+{product.colors.length - 3} nữa</span>
        )}
      </div>
      <div className="flex gap-3 w-full mt-auto pt-2">
        
      </div>
    </Link>
  );
};

export default ProductCard;