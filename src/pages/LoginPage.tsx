import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { signIn, signInWithProvider } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/');
      }, 1200);
    } catch (err) {
      setError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại!');
      setShowError(true);
      setPassword('');
      setTimeout(() => {
        setShowError(false);
        passwordRef.current?.focus();
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg('');
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/update-password`
    });
    setResetLoading(false);
    if (error) {
      setResetMsg('Gửi email thất bại: ' + error.message);
    } else {
      setResetMsg('Vui lòng kiểm tra email để đặt lại mật khẩu!');
      setResetEmail('');
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
            <User className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-primary-700 mb-1">Đăng nhập</h2>
          <p className="text-gray-500">Chào mừng bạn quay trở lại!</p>
        </div>
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
                className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-primary-200 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 bg-white/80 shadow transition-all duration-200 focus:ring-4 focus:ring-primary-300 hover:ring-2 hover:ring-primary-400"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Ghi nhớ đăng nhập
              </label>
            </div>
            <div className="text-sm">
              <button type="button" className="font-medium text-primary-600 hover:text-primary-500 transition" onClick={() => setShowReset(true)}>
                Quên mật khẩu?
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold shadow-lg hover:from-purple-500 hover:to-primary-500 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            onClick={() => signInWithProvider('google')}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-full bg-white/90 border border-primary-200 shadow hover:bg-primary-50 transition-all font-semibold text-primary-700 text-base hover:scale-105 active:scale-95"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Đăng nhập với Google
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500 transition">Đăng ký ngay</Link>
        </p>
      </motion.div>
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -15, y: 60, boxShadow: '0 0 0 0 rgba(34,197,94,0.3)' }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
              y: 0,
              boxShadow: '0 8px 32px 0 rgba(34,197,94,0.25), 0 0 60px 0 #22c55e55'
            }}
            exit={{ opacity: 0, scale: 0.7, rotate: 10, y: 60, boxShadow: '0 0 0 0 rgba(34,197,94,0.3)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, duration: 0.5 }}
            className="fixed bottom-8 right-4 z-50 bg-white/80 backdrop-blur-xl px-8 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-2 border-2 border-green-400 max-w-[90vw] w-full sm:w-auto"
            style={{ filter: 'drop-shadow(0 0 32px #22c55e88)' }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1.2, 1], boxShadow: '0 0 32px 8px #22c55e55' }}
              transition={{ repeat: Infinity, duration: 1.2, repeatType: 'reverse' }}
              className="rounded-full bg-green-500 p-3 mb-2 shadow-lg"
            >
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#22c55e"/><path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.div>
            <span className="text-lg font-bold text-green-700 drop-shadow">Đăng nhập thành công!</span>
          </motion.div>
        )}
        {showError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: 10, y: 60, boxShadow: '0 0 0 0 rgba(239,68,68,0.3)' }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
              y: 0,
              boxShadow: '0 8px 32px 0 rgba(239,68,68,0.25), 0 0 60px 0 #ef444455'
            }}
            exit={{ opacity: 0, scale: 0.7, rotate: -10, y: 60, boxShadow: '0 0 0 0 rgba(239,68,68,0.3)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, duration: 0.5 }}
            className="fixed bottom-8 right-4 z-50 bg-white/80 backdrop-blur-xl px-8 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-2 border-2 border-red-400 max-w-[90vw] w-full sm:w-auto"
            style={{ filter: 'drop-shadow(0 0 32px #ef444488)' }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1.2, 1], boxShadow: '0 0 32px 8px #ef444455' }}
              transition={{ repeat: Infinity, duration: 1.2, repeatType: 'reverse' }}
              className="rounded-full bg-red-500 p-3 mb-2 shadow-lg"
            >
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ef4444"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.div>
            <span className="text-lg font-bold text-red-700 drop-shadow">{error}</span>
          </motion.div>
        )}
        {showReset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-4 text-primary-700">Quên mật khẩu</h3>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block mb-1">Nhập email đăng ký</label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required className="w-full border rounded px-3 py-2" />
                </div>
                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded" disabled={resetLoading}>
                  {resetLoading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
                </button>
                {resetMsg && <div className={`mt-2 ${resetMsg.includes('kiểm tra') ? 'text-green-600' : 'text-red-500'}`}>{resetMsg}</div>}
              </form>
              <button onClick={() => { setShowReset(false); setResetMsg(''); }} className="mt-4 text-sm text-gray-500 hover:text-primary-600">Đóng</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}