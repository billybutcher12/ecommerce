import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  // Hiển thị tối đa 5 trang
  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    
    // Điều chỉnh start nếu end đã ở cuối
    if (end === totalPages) {
      start = Math.max(1, totalPages - 4);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-2">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-lg ${
          currentPage === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
        }`}
      >
        <ChevronLeft size={20} />
      </motion.button>

      {currentPage > 3 && totalPages > 5 && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPageChange(1)}
            className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200"
          >
            1
          </motion.button>
          {currentPage > 4 && <span className="px-2">...</span>}
        </>
      )}

      {visiblePages.map((page) => (
        <motion.button
          key={page}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-lg font-medium ${
            currentPage === page
              ? 'bg-primary-600 text-white'
              : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
          }`}
        >
          {page}
        </motion.button>
      ))}

      {currentPage < totalPages - 2 && totalPages > 5 && (
        <>
          {currentPage < totalPages - 3 && <span className="px-2">...</span>}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPageChange(totalPages)}
            className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200"
          >
            {totalPages}
          </motion.button>
        </>
      )}

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-lg ${
          currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
        }`}
      >
        <ChevronRight size={20} />
      </motion.button>
    </div>
  );
};

export default Pagination; 