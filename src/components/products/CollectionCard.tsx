import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface CollectionCardProps {
  title: string;
  imageUrl: string;
  link: string;
}

const CollectionCard = ({ title, imageUrl, link }: CollectionCardProps) => {
  return (
    <Link to={link} className="block group relative overflow-hidden rounded-lg shadow-lg h-64">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <motion.h3 
          className="text-white text-2xl font-serif font-medium mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h3>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 40 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="h-1 bg-primary-500 mb-4"
        ></motion.div>
        <motion.span 
          className="text-white text-sm font-medium relative pl-6 inline-block group-hover:pl-8 transition-all duration-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-0.5 bg-white group-hover:w-6 transition-all duration-300"></span>
          Shop Now
        </motion.span>
      </div>
    </Link>
  );
};

export default CollectionCard;