import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { signUp, signInWithProvider } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(email, password);
      navigate('/login');
    } catch (err) {
      setError('Đăng ký thất bại. Vui lòng kiểm tra lại email hoặc thử lại!');
      setPassword('');
      setTimeout(() => passwordRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderRegister = async (provider: 'google') => {
    setLoading(true);
    try {
      await signInWithProvider(provider);
      navigate('/login');
    } catch (err) {
      setError('Đăng ký thất bại');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-white py-12 px-4 relative overflow-hidden">
      {/* Hiệu ứng background động 3D nhiều blob */}
      <motion.div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-gradient-to-br from-primary-400 via-purple-400 to-blue-400 rounded-full blur-3xl opacity-60 z-0"
        initial={{ scale: 0.8, rotate: 0, x: 0, y: 0 }}
        animate={{ 
          scale: [0.8, 1.1, 0.9, 1], 
          rotate: [0, 30, -20, 0], 
          x: [0, 40, -30, 0],
          y: [0, 20, -10, 0],
          opacity: [0.7, 0.9, 0.8, 0.7] 
        }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        style={{ filter: 'blur(80px)' }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 w-[340px] h-[340px] bg-gradient-to-br from-blue-300 via-purple-200 to-white rounded-full blur-3xl opacity-50 z-0"
        initial={{ scale: 0.7, rotate: 0, x: 0, y: 0 }}
        animate={{ 
          scale: [0.7, 1.05, 0.8, 1], 
          rotate: [0, -25, 15, 0], 
          x: [0, -30, 20, 0],
          y: [0, -15, 10, 0],
          opacity: [0.5, 0.7, 0.6, 0.5] 
        }}
        transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
        style={{ filter: 'blur(60px)' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[180px] h-[180px] bg-gradient-to-br from-purple-200 via-white to-blue-200 rounded-full blur-2xl opacity-40 z-0"
        initial={{ scale: 0.6, rotate: 0, x: 0, y: 0 }}
        animate={{ 
          scale: [0.6, 1.2, 0.8, 1], 
          rotate: [0, 15, -10, 0], 
          x: [0, 20, -10, 0],
          y: [0, 10, -5, 0],
          opacity: [0.4, 0.6, 0.5, 0.4] 
        }}
        transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
        style={{ filter: 'blur(40px)' }}
      />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="w-full max-w-md bg-white/90 rounded-3xl shadow-2xl p-10 backdrop-blur-lg relative z-10 flex flex-col gap-6"
        style={{ boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)' }}
      >
        <div className="flex flex-col items-center mb-2">
          <motion.div whileHover={{ scale: 1.1, rotate: 8 }} className="bg-gradient-to-br from-primary-500 to-purple-500 rounded-full p-4 mb-2 shadow-lg">
            <UserPlus className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-primary-700 mb-1">Đăng ký tài khoản</h2>
          <p className="text-gray-500">Tạo tài khoản mới để trải nghiệm mua sắm!</p>
        </div>
        {/* Nút đăng ký với Google và Facebook */}
        <div className="flex flex-col gap-3 mb-2">
          <button
            type="button"
            onClick={() => handleProviderRegister('google')}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-full bg-white/90 border border-primary-200 shadow hover:bg-primary-50 transition-all font-semibold text-primary-700 text-base hover:scale-105 active:scale-95"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Đăng ký với Google
          </button>
        </div>
        <div className="flex items-center gap-2 my-2">
          <div className="flex-1 h-px bg-primary-200" />
          <span className="text-primary-400 text-xs font-semibold">hoặc đăng ký bằng email</span>
          <div className="flex-1 h-px bg-primary-200" />
        </div>
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg mb-2 text-center" role="alert">
            {error}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-primary-200 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 bg-white/80 shadow transition-all duration-200 focus:ring-4 focus:ring-primary-300 hover:ring-2 hover:ring-primary-400"
                placeholder="Email"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="block w-full rounded-lg border-0 py-2 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-primary-200 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 bg-white/80 shadow transition-all duration-200 focus:ring-4 focus:ring-primary-300 hover:ring-2 hover:ring-primary-400"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                ref={passwordRef}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 focus:outline-none">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold shadow-lg hover:from-purple-500 hover:to-primary-500 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition">Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
}