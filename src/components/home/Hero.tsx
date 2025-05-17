import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Hero slide type
interface HeroSlide {
  id: number;
  heading: string;
  subtext: string;
  buttonText: string;
  buttonLink: string;
  image: string;
}

const slides: HeroSlide[] = [
  {
    id: 1,
    heading: 'Summer Collection 2025',
    subtext: 'Discover the season\'s hottest trends with our latest collection',
    buttonText: 'Shop Now',
    buttonLink: '/products?collection=summer',
    image: 'https://images.pexels.com/photos/994523/pexels-photo-994523.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
  },
  {
    id: 2,
    heading: 'Exclusive Designer Items',
    subtext: 'Limited edition pieces that define elegance and style',
    buttonText: 'Explore',
    buttonLink: '/products?category=designer',
    image: 'https://images.pexels.com/photos/953266/pexels-photo-953266.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
  },
  {
    id: 3,
    heading: 'Accessories Collection',
    subtext: 'Complete your look with our premium accessories',
    buttonText: 'View Collection',
    buttonLink: '/products?category=accessories',
    image: 'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
  }
];

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };
  
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        staggerChildren: 0.1 
      }
    }
  };
  
  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };
  
  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative h-hero overflow-hidden">
      {/* Slides */}
      <AnimatePresence initial={false} custom={1}>
        <motion.div
          key={slides[currentSlide].id}
          custom={1}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          
          {/* Slide Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="container mx-auto px-4 text-center">
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="max-w-3xl mx-auto text-white"
              >
                <motion.h1 variants={textVariants} className="font-serif text-5xl md:text-6xl font-semibold mb-4">
                  {slides[currentSlide].heading}
                </motion.h1>
                <motion.p variants={textVariants} className="text-xl md:text-2xl mb-8">
                  {slides[currentSlide].subtext}
                </motion.p>
                <motion.div variants={textVariants}>
                  <Link 
                    to={slides[currentSlide].buttonLink} 
                    className="inline-block bg-white text-secondary-900 px-8 py-3 rounded-md font-medium hover:bg-opacity-90 transition-colors"
                  >
                    {slides[currentSlide].buttonText}
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Navigation Arrows */}
      <button 
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-3 rounded-full hover:bg-opacity-50 transition-all z-10"
        onClick={handlePrevSlide}
        aria-label="Previous slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button 
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-3 rounded-full hover:bg-opacity-50 transition-all z-10"
        onClick={handleNextSlide}
        aria-label="Next slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-3 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white bg-opacity-50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          ></button>
        ))}
      </div>
    </section>
  );
};

export default Hero;