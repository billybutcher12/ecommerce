import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame as Fire, Star, AlertTriangle, Clock, Heart } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';

// Nút gradient có hiệu ứng sáng theo chuột
const ButtonGradientGlow = ({ children, onClick, disabled }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btn.style.setProperty('--x', `${x}px`);
    btn.style.setProperty('--y', `${y}px`);
  };
  return (
    <button
      ref={btnRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className="relative w-12 h-12 flex items-center justify-center rounded-full border-none outline-none select-none font-bold text-xl text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-primary-600 to-purple-500 overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(90deg, #7c3aed 0%, #a21caf 100%)',
      }}
    >
      <span className="z-10 relative">{children}</span>
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)',
          transition: 'background 0.2s',
        }}
      />
    </button>
  );
};

// Box số lượng có hiệu ứng gradient sáng và xoay 3D theo chuột
const QuantityBox3D = ({ children }: { children: React.ReactNode }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Xoay nhẹ theo hướng chuột
    const rotateY = ((x - centerX) / centerX) * 10; // max 10deg
    const rotateX = -((y - centerY) / centerY) * 10;
    setStyle({
      transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` ,
      background: `radial-gradient(circle at ${x}px ${y}px, rgba(124,58,237,0.12) 0%, rgba(168,34,175,0.08) 60%, transparent 100%)`,
      transition: 'transform 0.15s cubic-bezier(.25,.46,.45,.94), background 0.2s',
    });
  };
  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(600px) rotateX(0deg) rotateY(0deg)',
      background: 'transparent',
      transition: 'transform 0.3s, background 0.3s',
    });
  };
  return (
    <div
      ref={boxRef}
      className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white shadow-lg border border-primary-100"
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

// Hiệu ứng 3D: nền trắng, border mặc định trắng/trong suốt, khi hover border là gradient tím trượt quanh viền theo chuột
const Glow3DBox = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<any>({});
  const [borderPos, setBorderPos] = React.useState({ x: 50, y: 50 });
  const [hovered, setHovered] = React.useState(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setBorderPos({ x, y });
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((e.clientX - rect.left - centerX) / centerX) * 10;
    const rotateX = -((e.clientY - rect.top - centerY) / centerY) * 10;
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` ,
      background: '#fff',
      transition: 'transform 0.18s cubic-bezier(.25,.46,.45,.94)',
      border: hovered
        ? '4px solid transparent'
        : '4px solid #fff',
      borderImage: hovered
        ? `radial-gradient(circle at ${borderPos.x}% ${borderPos.y}%, #a78bfa 0%, #7c3aed 60%, transparent 100%) 1` 
        : 'none',
      boxSizing: 'border-box',
    });
  };
  const handleMouseLeave = () => {
    setHovered(false);
    setStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)',
      background: '#fff',
      border: '4px solid #fff',
      borderImage: 'none',
      transition: 'transform 0.3s, border 0.3s',
      boxSizing: 'border-box',
    });
  };
  const handleMouseEnter = () => setHovered(true);
  return (
    <div
      ref={boxRef}
      className={className + ' relative'}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <div className="relative z-20">{children}</div>
    </div>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<Database['public']['Tables']['products']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Database['public']['Tables']['reviews']['Row'][]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [related, setRelated] = useState<Database['public']['Tables']['products']['Row'][]>([]);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const { addToCart } = useCart();
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const [heartStyle, setHeartStyle] = useState<any>({});
  const heartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (!error) setProduct(data);
      setLoading(false);
    };
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewLoading(true);
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      if (filterStar) query = query.eq('rating', filterStar);
      const { data, error } = await query;
      if (!error) setReviews(data || []);
      setReviewLoading(false);
    };
    if (id) fetchReviews();
  }, [id, submitting, filterStar]);

  useEffect(() => {
    // Lấy sản phẩm liên quan cùng danh mục
    const fetchRelated = async () => {
      if (product?.category_id) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', product.category_id)
          .neq('id', product.id)
          .limit(4);
        setRelated(data || []);
      }
    };
    if (product) fetchRelated();
  }, [product]);

  // Real-time đánh giá
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel('realtime-reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `product_id=eq.${id}` }, () => {
        // Khi có thay đổi, fetch lại reviews
        setReviewLoading(true);
        supabase
          .from('reviews')
          .select('*')
          .eq('product_id', id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setReviews(data || []);
            setReviewLoading(false);
          });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Fetch user profiles for reviews
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (reviews.length > 0) {
        const userIds = [...new Set(reviews.map(r => r.user_id))];
        const { data } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        if (data) {
          const profiles = data.reduce((acc, user) => ({
            ...acc,
            [user.id]: user
          }), {});
          setUserProfiles(profiles);
        }
      }
    };
    fetchUserProfiles();
  }, [reviews]);

  useEffect(() => {
    if (product) {
      setSelectedColor(Array.isArray(product.colors) && product.colors.length > 0 ? product.colors[0] : '');
      setSelectedSize(Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes[0] : '');
      setQuantity(1);
    }
  }, [product]);

  // Ưu tiên lấy ảnh từ image_url, sau đó image_urls, cuối cùng là ảnh mặc định
  const imageUrl = product?.image_url
    ? product.image_url
    : (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0
    ? product.image_urls[0]
      : 'https://via.placeholder.com/600x600?text=No+Image');

  // Badge động
  const getBadge = () => {
    if (!product) return null;
    const sold = (product as any).sold;
    if (typeof sold === 'number' && sold > 20) return { label: 'Bán chạy', color: 'bg-orange-100 text-orange-700', icon: <Fire className="w-4 h-4 mr-1" /> };
    if (product.stock !== undefined && product.stock <= 3) return { label: 'Sắp hết hàng', color: 'bg-red-100 text-red-700 animate-pulse', icon: <AlertTriangle className="w-4 h-4 mr-1" /> };
    const created = new Date(product.created_at || '');
    if ((Date.now() - created.getTime()) < 1000 * 60 * 60 * 24 * 7) return { label: 'Mới về', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-4 h-4 mr-1" /> };
    return null;
  };
  const badge = getBadge();

  // Tính trung bình số sao
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;

  // Gửi đánh giá mới
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
      product_id: id,
        user_id: user.id,
      rating,
      comment,
    });
      if (error) throw error;
    setComment('');
    setRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Có lỗi xảy ra khi gửi đánh giá');
    } finally {
    setSubmitting(false);
    }
  };

  // Sửa lỗi ảnh
 

  const handleAddToCart = () => {
    if (!product) return;
    
    // Kiểm tra số lượng tồn kho
    if (product.stock === 0) {
      toast.error('Sản phẩm đã hết hàng');
      return;
    }

    if ((product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0)) {
      setShowBuyNowModal(true);
      return;
    }
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      quantity: 1,
      color: '',
      size: ''
    });
    toast.success(`${product.name} đã thêm vào giỏ hàng`);
  };

  const handleConfirmBuyNow = () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }
    if (!product) return;

    // Kiểm tra số lượng tồn kho
    if (product.stock === 0) {
      toast.error('Sản phẩm đã hết hàng');
      setShowBuyNowModal(false);
      return;
    }

    if (quantity > product.stock) {
      toast.error('Vượt quá số lượng tồn kho!');
      return;
    }
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      quantity,
      color: selectedColor,
      size: selectedSize
    });
    setShowBuyNowModal(false);
    toast.success(`${product.name} đã thêm vào giỏ hàng`);
  };

  const handleHeartMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHeartStyle({
      transform: `scale(1.25) rotate(${(x-rect.width/2)/3}deg) translate(${(x-rect.width/2)/2.5}px, ${(y-rect.height/2)/2.5}px)`,
      filter: `drop-shadow(0 0 24px #f87171)`,
      transition: 'transform 0.10s, filter 0.10s'
    });
  };
  const handleHeartMouseLeave = () => setHeartStyle({});

  const handleHeartClick = async () => {
    if (!user || !product) {
      toast.error('Vui lòng đăng nhập để sử dụng chức năng yêu thích');
      return;
    }
    if (isWishlisted(product.id)) {
      await removeFromWishlist(product.id);
      toast.success('Đã xóa khỏi yêu thích');
    } else {
      await addToWishlist(product.id);
      toast.success('Đã thêm vào yêu thích');
    }
  };

  return (
    <div className="container mx-auto px-2 md:px-4 py-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {/* Product Image Section */}
          <motion.div
            whileHover={{ scale: 1.04, rotateY: 8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="bg-white rounded-3xl shadow-2xl p-4 flex items-center justify-center min-h-[400px] md:min-h-[500px]"
            style={{ perspective: '1200px' }}
          >
            <div className="aspect-square w-full rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden shadow-xl">
              {loading ? (
                <div className="animate-pulse w-2/3 h-2/3 bg-gray-300 rounded-2xl" />
              ) : (
                <img
                  src={imageUrl}
                  alt={product?.name}
                  onError={e => {
                    const target = e.currentTarget;
                    if (!target.src.includes('placeholder.com')) {
                      target.src = 'https://via.placeholder.com/600x600?text=No+Image';
                    }
                  }}
                  className="w-full h-full object-cover rounded-2xl transition-transform duration-500"
                />
              )}
            </div>
          </motion.div>

          {/* Product Details Section */}
          <div className="flex flex-col space-y-8 justify-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-primary-800 mb-2 drop-shadow-lg flex items-center gap-3">
                {loading ? 'Đang tải...' : product?.name}
                <button
                  ref={heartBtnRef}
                  onClick={handleHeartClick}
                  onMouseMove={handleHeartMouseMove}
                  onMouseLeave={handleHeartMouseLeave}
                  style={heartStyle}
                  className="ml-2 focus:outline-none relative"
                  aria-label="Yêu thích"
                >
                  <Heart size={28} className={isWishlisted(product?.id || '') ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
                </button>
                {badge && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full font-semibold text-sm ml-2 ${badge.color}`}>{badge.icon}{badge.label}</span>
                )}
              </h1>
              <p className="mt-1 text-2xl text-primary-600 font-bold mb-4">
                {loading ? '' : product?.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
              </p>
              <div className="flex gap-4 items-center mb-4">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold flex items-center"><Fire className="w-5 h-5 mr-1" /> Đã bán: {typeof (product as any)?.sold === 'number' ? (product as any).sold : 0}</span>
                <span className={`px-3 py-1 rounded-full font-semibold ${typeof product?.stock === 'number' && product.stock > 5 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>Kho: {typeof product?.stock === 'number' ? product.stock : 0}</span>
              </div>
              <div className="prose prose-sm text-gray-600 mb-4 min-h-[60px]">
                {loading ? <p>Đang tải thông tin sản phẩm...</p> : <p>{product?.description}</p>}
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: product?.stock !== 0 ? 1.06 : 1, rotateX: product?.stock !== 0 ? 6 : 0, boxShadow: product?.stock !== 0 ? '0 8px 32px 0 rgba(80, 0, 200, 0.18)' : 'none' }}
                whileTap={{ scale: product?.stock !== 0 ? 0.97 : 1, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className={`w-full py-3 px-8 rounded-xl font-bold shadow-lg transition-all text-lg md:text-xl mt-2 mb-4 ${
                  product?.stock === 0 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-gradient-to-r from-primary-600 to-purple-500 text-white hover:from-purple-500 hover:to-primary-600'
                }`}
                disabled={loading || !product || product.stock === 0}
                onClick={handleAddToCart}
              >
                {product?.stock === 0 ? 'Đã hết hàng' : 'Thêm vào giỏ hàng'}
              </motion.button>
            </div>
            {/* Sản phẩm liên quan */}
            {related.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-100 rounded-2xl p-6 shadow flex flex-col gap-2 mt-2">
                <h3 className="text-lg font-semibold text-primary-700 mb-2">Sản phẩm liên quan</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {related.map(rp => {
                    const relatedImg =
                      rp.image_url ||
                      (Array.isArray(rp.image_urls) && rp.image_urls.length > 0 ? rp.image_urls[0] : 'https://via.placeholder.com/300x300?text=No+Image');
                    return (
                      <Link
                        to={`/products/${rp.id}`}
                        key={rp.id}
                        className="block bg-white rounded-xl shadow hover:scale-105 transition p-2 min-h-[220px]"
                      >
                        <img
                          src={relatedImg}
                          alt={rp.name}
                          onError={e => {
                            const target = e.currentTarget;
                            if (!target.src.includes('placeholder.com')) {
                              target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                            }
                          }}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                        <div className="p-1 text-center font-semibold text-primary-700 line-clamp-2 text-sm">{rp.name}</div>
                      </Link>
                    );
                  })}
                </div>
            </div>
            )}
          </div>
        </div>

        {/* Đánh giá & bình luận */}
        <div className="mt-14 bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-2 text-3xl font-bold text-yellow-500">
              {avgRating ? (
                <>
                  {[...Array(Math.round(Number(avgRating)))].map((_, i) => <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 }} className="inline-block">★</motion.span>)}
                  {[...Array(5 - Math.round(Number(avgRating)))].map((_, i) => <span key={i}>☆</span>)}
                  <span className="ml-3 text-gray-700 text-lg font-semibold">{avgRating} / 5</span>
                </>
              ) : (
                <span className="text-gray-400">Chưa có đánh giá</span>
              )}
            </div>
            <div className="text-gray-600 text-lg">Tổng {reviews.length} đánh giá</div>
            <div className="flex gap-2 items-center">
              {[1,2,3,4,5].map(star => (
                <button key={star} className={`rounded-full px-2 py-1 border ${filterStar === star ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-gray-100 text-yellow-500 border-gray-200'}`} onClick={() => setFilterStar(filterStar === star ? null : star)}>{star} <Star className="inline w-4 h-4" /></button>
              ))}
              {filterStar && <button className="ml-2 text-sm text-gray-500 underline" onClick={() => setFilterStar(null)}>Bỏ lọc</button>}
            </div>
          </div>

          {/* Danh sách bình luận */}
          <div className="space-y-6 mb-10">
            {reviewLoading ? (
              <div>Đang tải đánh giá...</div>
            ) : reviews.length === 0 ? (
              <div className="text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</div>
            ) : (
              <AnimatePresence>
                {reviews.map((r, idx) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 30, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: 30, rotateX: 15 }}
                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                    className="border-b pb-4 flex flex-col md:flex-row md:items-center md:gap-4 hover:bg-gray-50 p-4 rounded-xl transition-all duration-300"
                    style={{ perspective: '1000px' }}
                  >
                    <div className="flex items-center gap-4 mb-2 md:mb-0">
                      <motion.div
                        whileHover={{ scale: 1.1, rotateY: 10 }}
                        className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-200"
                      >
                        <img
                          src={userProfiles[r.user_id]?.avatar_url || '/default-avatar.png'}
                          alt={userProfiles[r.user_id]?.full_name || 'User'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/default-avatar.png';
                          }}
                        />
                      </motion.div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary-700">
                          {userProfiles[r.user_id]?.full_name || 'Người dùng'}
                        </span>
                      <span className="text-yellow-500 text-lg">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      </div>
                    </div>
                    <div className="text-gray-700 mb-1 flex-1">{r.comment}</div>
                    <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('vi-VN')}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Form gửi đánh giá mới */}
          <motion.form 
            onSubmit={handleSubmitReview} 
            className="flex flex-col md:flex-row items-center gap-4 mt-6 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-1">
              <span className="mr-2 font-semibold">Đánh giá:</span>
              {[1,2,3,4,5].map((star) => (
                <motion.button
                  type="button"
                  key={star}
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  className={star <= rating ? 'text-yellow-500 text-2xl' : 'text-gray-300 text-2xl'}
                  onClick={() => setRating(star)}
                  tabIndex={-1}
                >★</motion.button>
              ))}
            </div>
            <motion.input
              type="text"
              whileFocus={{ scale: 1.02 }}
              className="flex-1 border-2 border-primary-200 rounded-xl px-4 py-2 focus:outline-primary-500 shadow"
              placeholder="Viết bình luận của bạn..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={200}
              required
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05, rotateY: 5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-primary-600 to-purple-500 text-white px-8 py-2 rounded-xl font-semibold shadow hover:from-purple-500 hover:to-primary-600 transition-all text-lg"
              disabled={submitting || !comment.trim()}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </motion.button>
          </motion.form>
        </div>

        {/* Modal chọn màu/size */}
        <AnimatePresence>
          {product && ((product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0)) && showBuyNowModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
            >
              <Glow3DBox className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md flex flex-col items-center justify-center gap-6 relative">
                {/* Ảnh sản phẩm */}
                <Glow3DBox className="flex flex-col items-center mb-2 cursor-pointer" >
                  <img
                    src={product.image_url || (Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : 'https://via.placeholder.com/300x300?text=No+Image')}
                    alt={product.name}
                    className="w-36 h-36 object-cover rounded-2xl border-2 border-primary-100 shadow-lg mb-2 transition-transform duration-500"
                    onClick={() => setShowImageLightbox(true)}
                    style={{ cursor: 'zoom-in' }}
                  />
                  <span className="text-gray-500 text-xs">Ảnh sản phẩm</span>
                </Glow3DBox>
                <h3 className="text-2xl font-extrabold text-primary-700 mb-4 text-center">Chọn màu và size</h3>
                {Array.isArray(product?.colors) && product.colors.length > 0 && (
                  <div className="mb-4 w-full flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Màu sắc</label>
                    <div className="flex gap-3 flex-wrap justify-center">
                      {product.colors.map((color: string) => (
                        <button
                          key={color}
                          type="button"
                          className={`px-5 py-2 rounded-full border font-semibold shadow transition-all duration-200 text-base focus:outline-none ${selectedColor === color ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white border-primary-600 scale-105 shadow-lg' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-50 hover:text-primary-700'}`}
                          onClick={() => setSelectedColor(color)}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(product?.sizes) && product.sizes.length > 0 && (
                  <div className="mb-4 w-full flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Kích cỡ</label>
                    <div className="flex gap-3 flex-wrap justify-center">
                      {product.sizes.map((size: string) => (
                        <button
                          key={size}
                          type="button"
                          className={`px-5 py-2 rounded-full border font-semibold shadow transition-all duration-200 text-base focus:outline-none ${selectedSize === size ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white border-primary-600 scale-105 shadow-lg' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-50 hover:text-primary-700'}`}
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Số lượng và tồn kho */}
                <div className="mb-4 flex flex-col md:flex-row items-center gap-6 w-full justify-center">
                  <div className="flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Số lượng</label>
                    <QuantityBox3D>
                      <ButtonGradientGlow onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>-</ButtonGradientGlow>
                      <input type="number" min={1} max={product.stock} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))} className="w-16 text-center border rounded-xl font-semibold text-lg" />
                      <ButtonGradientGlow onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} disabled={quantity >= product.stock}>+</ButtonGradientGlow>
                    </QuantityBox3D>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Tồn kho</label>
                    <div className="text-primary-600 font-bold text-xl">{product.stock}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 w-full">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowBuyNowModal(false)}
                    className="px-6 py-2 text-base font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 shadow"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.07, rotateY: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmBuyNow}
                    className="px-6 py-2 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-purple-500 rounded-xl shadow hover:from-purple-500 hover:to-primary-600 transition-all"
                  >
                    Xác nhận
                  </motion.button>
                </div>
              </Glow3DBox>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Lightbox xem ảnh lớn */}
        <AnimatePresence>
          {showImageLightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center"
              onClick={() => setShowImageLightbox(false)}
            >
              <motion.img
                src={product?.image_url || (Array.isArray(product?.image_urls) && product?.image_urls.length > 0 ? product?.image_urls[0] : 'https://via.placeholder.com/800x800?text=No+Image')}
                alt={product?.name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white cursor-zoom-out"
                onClick={e => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProductDetailPage;