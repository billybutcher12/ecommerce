import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { ParallaxProvider, Parallax } from 'react-scroll-parallax';

type Category = Database['public']['Tables']['categories']['Row'];

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  image_urls?: string[];
  [key: string]: any;
}



const blobs = [
  {
    className: 'absolute top-[-120px] left-[-120px] w-[350px] h-[350px] bg-purple-200 opacity-40 rounded-full blur-3xl',
    speed: -10,
  },
  {
    className: 'absolute top-[40%] right-[-100px] w-[300px] h-[300px] bg-purple-100 opacity-30 rounded-full blur-2xl',
    speed: 8,
  },
  {
    className: 'absolute bottom-[-100px] left-[20%] w-[280px] h-[280px] bg-violet-100 opacity-30 rounded-full blur-2xl',
    speed: -6,
  },
  {
    className: 'absolute bottom-[-120px] right-[-120px] w-[350px] h-[350px] bg-indigo-100 opacity-30 rounded-full blur-3xl',
    speed: 12,
  },
];

const HomePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (!error) setProducts(data || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  // Hero animation
  const heroText = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 1 } }
  };

  return (
    <ParallaxProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#f3e8ff] to-[#e0e7ff] relative overflow-x-hidden">
        {/* Blobs background parallax */}
        {blobs.map((blob, idx) => (
          <Parallax key={idx} speed={blob.speed}>
            <div className={blob.className} />
          </Parallax>
        ))}

        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center min-h-[60vh] py-20 z-10">
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold text-center text-purple-700 drop-shadow-2xl mb-6 tracking-tight"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            Thời Trang Đỉnh Cao
          </motion.h1>
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Parallax speed={-10}>
              <span className="text-3xl md:text-4xl font-extrabold text-pink-500 drop-shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer">Áo</span>
            </Parallax>
            <span className="text-3xl md:text-4xl font-extrabold text-purple-300">•</span>
            <Parallax speed={10}>
              <span className="text-3xl md:text-4xl font-extrabold text-orange-400 drop-shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer">Quần</span>
            </Parallax>
            <span className="text-3xl md:text-4xl font-extrabold text-purple-300">•</span>
            <Parallax speed={-6}>
              <span className="text-3xl md:text-4xl font-extrabold text-yellow-400 drop-shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer">Vòng cổ</span>
            </Parallax>
            <span className="text-3xl md:text-4xl font-extrabold text-purple-300">•</span>
            <Parallax speed={6}>
              <span className="text-3xl md:text-4xl font-extrabold text-green-400 drop-shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer">Giày</span>
            </Parallax>
          </div>
          <motion.p
            className="text-xl md:text-2xl text-gray-700 text-center max-w-2xl mx-auto mb-10 drop-shadow-lg"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Khám phá bộ sưu tập thời trang mới nhất, cập nhật xu hướng, cá tính và hiện đại.
          </motion.p>
          <Link
            to="/products"
            className="inline-block px-10 py-4 bg-gradient-to-r from-primary-600 to-purple-500 text-white rounded-full font-bold text-lg shadow-xl hover:from-purple-500 hover:to-primary-600 transform hover:scale-110 transition-all duration-300 border-2 border-white/30"
          >
            Khám phá ngay
          </Link>
        </section>

        {/* Sản phẩm nổi bật - 2 hàng */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <Parallax speed={-8}>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-700 drop-shadow-lg tracking-tight">Sản Phẩm Nổi Bật</h2>
                <p className="text-xl text-secondary-600 max-w-2xl mx-auto font-medium">
                  Những sản phẩm hot trend, được yêu thích nhất tại cửa hàng!
                </p>
              </Parallax>
            </motion.div>
            {loading ? (
              <div className="text-center text-lg text-gray-500 py-20">Đang tải sản phẩm...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
                {products.map((item, idx) => (
                  <Parallax key={item.id} speed={idx % 4 === 0 ? -8 : idx % 4 === 1 ? 8 : idx % 4 === 2 ? -4 : 4} className="h-full">
                    <motion.div
                      className="group relative rounded-3xl overflow-hidden shadow-2xl bg-white/90 hover:scale-105 transition-transform duration-500 border border-white/40 h-full"
                      whileHover={{ scale: 1.07 }}
                    >
                      <img
                        src={item.image_url || (item.image_urls?.[0]) || 'https://via.placeholder.com/400x600?text=No+Image'}
                        alt={item.name}
                        className="w-full h-64 object-cover object-center group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-200/40 via-transparent to-transparent z-10" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                        <h3 className="text-xl font-bold text-purple-700 mb-2 drop-shadow-lg line-clamp-2">{item.name}</h3>
                        <p className="text-purple-500 mb-4 text-base font-medium drop-shadow">{item.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                        <Link
                          to={`/products/${item.id}`}
                          className="inline-block px-6 py-2 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-full font-semibold shadow hover:from-purple-600 hover:to-primary-600 transition-all duration-300 border-2 border-white/20"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </motion.div>
                  </Parallax>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section bình luận khách hàng với tiêu đề, bố cục hàng ngang, parallax, chỉ lấy review 5 sao */}
        <section className="py-12 relative z-10">
          <div className="container mx-auto px-4">
            <motion.h2
              className="text-3xl md:text-4xl font-extrabold mb-10 text-purple-700 text-center drop-shadow-lg"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              Khách hàng nói gì về shop?
            </motion.h2>
            <TestimonialCarousel />
          </div>
        </section>
      </div>
    </ParallaxProvider>
  );
};

// Component TestimonialCarousel
function TestimonialCarousel() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragLimit, setDragLimit] = useState(0);

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*, users:users(id, full_name, avatar_url), products(name)')
        .eq('rating', 5)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setComments(data || []);
      setLoading(false);
    };
    fetchComments();
  }, []);

  useLayoutEffect(() => {
    function updateDragLimit() {
      if (containerRef.current && trackRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const trackWidth = trackRef.current.scrollWidth;
        if (trackWidth > containerWidth) {
          setDragLimit(trackWidth - containerWidth);
        } else {
          setDragLimit(0);
        }
      }
    }
    updateDragLimit();
    window.addEventListener('resize', updateDragLimit);
    return () => window.removeEventListener('resize', updateDragLimit);
  }, [comments.length]);

  if (loading) return <div className="text-center text-gray-500">Đang tải bình luận...</div>;
  if (!comments.length) return <div className="text-center text-gray-400">Chưa có bình luận 5 sao nào.</div>;

  return (
    <div ref={containerRef} className="relative w-full max-w-6xl mx-auto overflow-hidden py-8">
      <motion.div
        ref={trackRef}
        className="flex gap-8 cursor-grab active:cursor-grabbing px-2"
        drag={dragLimit > 0 ? 'x' : false}
        dragConstraints={{ left: -dragLimit, right: 0 }}
        dragElastic={0.18}
        style={{ touchAction: "pan-x" }}
      >
        {comments.map((c, idx) => (
          <motion.div
            key={c.id}
            className={`bg-white rounded-3xl shadow-xl px-8 py-8 min-w-[340px] max-w-[340px] flex flex-col items-center text-center border transition-all duration-500 mx-auto
              ${idx === active ? "scale-105 border-purple-500 shadow-2xl z-10" : "scale-100 border-purple-100"}
            `}
            whileHover={{ scale: 1.08, boxShadow: "0 8px 32px 0 rgba(128,0,255,0.15)" }}
            onClick={() => setActive(idx)}
            style={{ cursor: 'pointer' }}
          >
            <img src={c.users?.avatar_url || '/default-avatar.png'} alt={c.users?.full_name || 'User'} className="w-14 h-14 rounded-full object-cover border-2 border-purple-200 mb-2" />
            <div className="font-bold text-purple-700 text-lg mb-1">{c.users?.full_name || 'Khách hàng'}</div>
            <div className="text-yellow-500 text-xl mb-2">{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</div>
            <div className="text-gray-700 mb-2 italic line-clamp-3">"{c.comment}"</div>
            <div className="text-sm text-gray-400">
              Về sản phẩm: <span className="font-semibold text-primary-600">{c.products?.name || ''}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {comments.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`w-3 h-3 rounded-full ${active === idx ? 'bg-purple-500' : 'bg-purple-200'}`}
          ></button>
        ))}
      </div>
    </div>
  );
}

export default HomePage;