import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import ProductCard from './ProductCard';

type Product = Database['public']['Tables']['products']['Row'];

const NewArrivals = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
          
        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
        // Use placeholder data for demo purposes
        setProducts(placeholderProducts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewArrivals();
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-secondary-200 h-80 mb-4 rounded-md"></div>
            <div className="h-4 bg-secondary-200 rounded mb-2"></div>
            <div className="h-4 bg-secondary-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-secondary-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // If no products, show placeholders
  const displayProducts = products.length > 0 ? products : placeholderProducts;

  return (
    <motion.div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {displayProducts.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
};

// Placeholder products for demonstration
const placeholderProducts: Product[] = [
  {
    id: '5',
    created_at: new Date().toISOString(),
    name: 'Striped Cotton T-Shirt',
    description: 'Classic striped t-shirt made from premium cotton.',
    price: 29.99,
    category_id: '2',
    image_urls: ['https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Blue', 'Red', 'Green'],
    stock: 20,
    is_featured: false
  },
  {
    id: '6',
    created_at: new Date().toISOString(),
    name: 'High-Waisted Jeans',
    description: 'Fashionable high-waisted jeans with perfect fit.',
    price: 79.99,
    category_id: '1',
    image_urls: ['https://images.pexels.com/photos/1346187/pexels-photo-1346187.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/1346187/pexels-photo-1346187.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Blue', 'Black'],
    stock: 15,
    is_featured: false
  },
  {
    id: '7',
    created_at: new Date().toISOString(),
    name: 'Designer Sunglasses',
    description: 'Premium sunglasses with UV protection.',
    price: 149.99,
    category_id: '3',
    image_urls: ['https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['One Size'],
    colors: ['Black', 'Tortoise'],
    stock: 8,
    is_featured: false
  },
  {
    id: '8',
    created_at: new Date().toISOString(),
    name: 'Leather Ankle Boots',
    description: 'Stylish leather ankle boots for any occasion.',
    price: 119.99,
    category_id: '4',
    image_urls: ['https://images.pexels.com/photos/292999/pexels-photo-292999.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/292999/pexels-photo-292999.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['36', '37', '38', '39', '40'],
    colors: ['Black', 'Brown'],
    stock: 10,
    is_featured: false
  }
];

export default NewArrivals;