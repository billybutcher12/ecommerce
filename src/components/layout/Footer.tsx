import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Send } from 'lucide-react';
import Logo from '../ui/Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div>
            <Link to="/">
              <Logo dark={false} />
            </Link>
            <p className="mt-4 text-secondary-300 text-sm leading-relaxed">
              Your premium fashion destination for the latest styles and trends. Quality meets elegance in every piece.
            </p>
            <div className="mt-6 flex space-x-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-secondary-300 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-secondary-300 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-secondary-300 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          {/* Shop Column */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products?category=women" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Women
                </Link>
              </li>
              <li>
                <Link to="/products?category=men" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Men
                </Link>
              </li>
              <li>
                <Link to="/products?category=accessories" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Accessories
                </Link>
              </li>
              <li>
                <Link to="/products?featured=true" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/products?sale=true" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Sale
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Account Column */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/profile/orders" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Order History
                </Link>
              </li>
              <li>
                <Link to="/profile/wishlist" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Newsletter Column */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Stay Updated</h3>
            <p className="text-secondary-300 text-sm mb-4">
              Subscribe to our newsletter for updates on new arrivals, trends, and exclusive offers.
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="bg-secondary-800 border border-secondary-700 text-white px-4 py-2 rounded-l focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm w-full"
              />
              <button 
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-r flex items-center justify-center transition-colors"
                aria-label="Subscribe"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className="pt-8 border-t border-secondary-800 text-center md:flex md:justify-between md:items-center">
          <p className="text-secondary-400 text-sm">
            &copy; {currentYear} LUXE Fashion. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex flex-wrap justify-center md:justify-end gap-4">
            <Link to="/privacy-policy" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Terms of Service
            </Link>
            <Link to="/shipping-policy" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Shipping Policy
            </Link>
            <Link to="/refund-policy" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;