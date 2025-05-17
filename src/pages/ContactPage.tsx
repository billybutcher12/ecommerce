import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ContactPage = () => {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      setFormData((prev) => ({
        ...prev,
        name: profile.full_name || '',
        email: user.email || '',
      }));
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Lưu vào supabase (bảng contact)
      const { error } = await supabase.from('contact').insert([
        {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
      ]);
      if (error) throw error;

      // Gửi email về admin (dùng EmailJS hoặc API backend)
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_xxx', // Thay bằng service id của bạn
          template_id: 'template_xxx', // Thay bằng template id của bạn
          user_id: 'user_xxx', // Thay bằng user id của bạn
          template_params: {
            from_name: formData.name,
            from_email: formData.email,
            subject: formData.subject,
            message: formData.message,
            to_email: 'nguyenthuantai00@gmail.com',
          },
        }),
      });

      toast.success('Gửi liên hệ thành công! Cảm ơn bạn đã góp ý.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error('Gửi liên hệ thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-white py-12 px-4">
      <div className="container mx-auto max-w-5xl w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-700 text-center mb-10 drop-shadow">Liên hệ với chúng tôi</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Contact Information */}
          <div>
            <div className="bg-gradient-to-br from-purple-100 to-white rounded-2xl shadow-2xl p-8 flex flex-col gap-6 items-start border border-purple-200">
              <h2 className="text-2xl font-semibold mb-2 text-primary-700 flex items-center gap-2">
                <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0M12 3v4m0 0a4 4 0 01-4 4m4-4a4 4 0 014 4m-4 4v4m0 0a4 4 0 01-4 4m4-4a4 4 0 014 4" /></svg>
                Thông tin liên hệ
              </h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="text-sm font-medium">Địa chỉ</h3>
                  <p className="mt-1">123 Đường ABC, Quận XYZ<br />Thành phố Hồ Chí Minh, Việt Nam</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Email</h3>
                  <p className="mt-1">contact@example.com</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Điện thoại</h3>
                  <p className="mt-1">+84 123 456 789</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Giờ làm việc</h3>
                  <p className="mt-1">Thứ Hai - Thứ Sáu: 8:00 - 17:00<br />Thứ Bảy: 8:00 - 12:00<br />Chủ Nhật: Nghỉ</p>
                </div>
              </div>
            </div>
          </div>
          {/* Contact Form */}
          <div>
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-purple-200">
              <h2 className="text-2xl font-semibold mb-4 text-primary-700 flex items-center gap-2">
                <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0M12 3v4m0 0a4 4 0 01-4 4m4-4a4 4 0 014 4m-4 4v4m0 0a4 4 0 01-4 4m4-4a4 4 0 014 4" /></svg>
                Gửi tin nhắn
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Họ và tên</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-primary-200 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 bg-white/80 shadow transition-all duration-200 focus:ring-4 focus:ring-primary-300 hover:ring-2 hover:ring-primary-400"
                    required
                    disabled={!!user}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-primary-200 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 bg-white/80 shadow transition-all duration-200 focus:ring-4 focus:ring-primary-300 hover:ring-2 hover:ring-primary-400"
                    required
                    disabled={!!user}
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-primary-200 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 bg-white/80 shadow transition-all duration-200 focus:ring-4 focus:ring-primary-300 hover:ring-2 hover:ring-primary-400"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">Nội dung</label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-primary-200 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 bg-white/80 shadow transition-all duration-200 focus:ring-4 focus:ring-primary-300 hover:ring-2 hover:ring-primary-400"
                    required
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold shadow-lg text-lg hover:from-purple-500 hover:to-primary-500 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Widget chat Zalo */}
      <div dangerouslySetInnerHTML={{ __html: `
        <div class="zalo-chat-widget" data-oaid="YOUR_OAID" data-welcome-message="Xin chào! Bạn cần hỗ trợ gì?" data-autopopup="0" data-width="350" data-height="420"></div>
        <script src="https://sp.zalo.me/plugins/sdk.js"></script>
      ` }} />
    </div>
  );
};

export default ContactPage; 