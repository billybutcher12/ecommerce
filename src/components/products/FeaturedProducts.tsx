import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import ProductCard from './ProductCard';

type Product = Database['public']['Tables']['products']['Row'];

const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_featured', true)
          .limit(4);
          
        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching featured products:', error);
        // Use placeholder data for demo purposes
        setProducts(placeholderProducts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
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
          <ProductCard product={{
            ...product,
            image_urls: product.image_urls || (product.image_url ? [product.image_url] : []),
            image_url: product.image_url || '',
          }} />
        </motion.div>
      ))}
    </motion.div>
  );
};

// Placeholder products for demonstration
const placeholderProducts: Product[] = [
  {
    id: '1',
    created_at: new Date().toISOString(),
    name: 'Silk Summer Dress',
    description: 'Elegant silk dress perfect for summer occasions.',
    price: 89.99,
    category_id: '1',
    image_urls: ['https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['White', 'Black', 'Red'],
    stock: 12,
    is_featured: true
  },
  {
    id: '2',
    created_at: new Date().toISOString(),
    name: "Men's Casual Blazer",
    description: 'A stylish blazer for casual and semi-formal occasions.',
    price: 129.99,
    category_id: '2',
    image_urls: ['https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Navy', 'Gray', 'Black'],
    stock: 8,
    is_featured: true
  },
  {
    id: '3',
    created_at: new Date().toISOString(),
    name: 'Designer Leather Handbag',
    description: 'Premium leather handbag with gold hardware.',
    price: 199.99,
    category_id: '3',
    image_urls: ['https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['One Size'],
    colors: ['Black', 'Brown', 'Tan'],
    stock: 5,
    is_featured: true
  },
  {
    id: '4',
    created_at: new Date().toISOString(),
    name: 'Crystal Statement Necklace',
    description: 'Stunning crystal necklace to elevate any outfit.',
    price: 59.99,
    category_id: '3',
    image_urls: ['https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=800'],
    image_url: 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['One Size'],
    colors: ['Silver', 'Gold'],
    stock: 15,
    is_featured: true
  }
];

export default FeaturedProducts;