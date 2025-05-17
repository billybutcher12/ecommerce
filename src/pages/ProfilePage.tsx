/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, MapPin, ShoppingBag, Heart, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import defaultAvatar from '../assets/default-avatar.svg';
import { useWishlist } from '../hooks/useWishlist';
import { Link } from 'react-router-dom';

const TABS = [
  { key: 'info', label: 'Thông tin cá nhân', icon: <User size={20} /> },
  { key: 'address', label: 'Địa chỉ giao hàng', icon: <MapPin size={20} /> },
  { key: 'orders', label: 'Đơn hàng của tôi', icon: <ShoppingBag size={20} /> },
  { key: 'wishlist', label: 'Yêu thích', icon: <Heart size={20} /> },
  { key: 'password', label: 'Đổi mật khẩu', icon: <KeyRound size={20} /> },
];

type Address = {
  id: string;
  user_id: string;
  address_line: string;
  ward: string;
  district: string;
  city: string;
  label: string;
  is_default: boolean;
};



// Thêm các constants cho validation
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ProfilePage() {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [formData, setFormData] = useState({
    full_name: userInfo?.full_name || '',
    phone: userInfo?.phone || '',
    email: user?.email || '',
    avatar_url: userInfo?.avatar_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Địa chỉ giao hàng hiện đại
  const [addresses, setAddresses] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{
    id: string;
    label: string;
    type: string;
    full_address: string;
    lat: number | null;
    lng: number | null;
    country: string;
    is_default: boolean;
  }>({
    id: '',
    label: '',
    type: '',
    full_address: '',
    lat: null,
    lng: null,
    country: 'VN',
    is_default: false,
  });
  

  // Thêm state cho địa chỉ mới
  const [addressForm, setAddressForm] = useState({
    city: '',
    city_code: '',
    district: '',
    district_code: '',
    ward: '',
    ward_code: '',
    address_line: '',
    label: '',
    is_default: false,
  });
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    show: boolean;
  }[]>([]);

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [totalAddresses, setTotalAddresses] = useState(0);
  const maxPages = 3;

  // Thêm state previewUrl để xem trước ảnh
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Thêm state để mở modal xem ảnh
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // State cho modal xác nhận xóa địa chỉ
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  // Thêm state cho đơn hàng
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Thêm state cho modal chi tiết đơn hàng
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Thêm state cho modal yêu cầu hoàn tiền
  const [showRefundRequestModal, setShowRefundRequestModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  // State cho đổi mật khẩu
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const { wishlist, removeFromWishlist, loading: wishlistLoading, fetchWishlist } = useWishlist();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);

  // Đưa các state/ref hiệu ứng card wishlist ra ngoài map
  const cardRefs = useRef<{[id: string]: HTMLDivElement | null}>({});
  const [cardStyles, setCardStyles] = useState<{[id: string]: any}>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [borderPos, setBorderPos] = useState<{[id: string]: {x: number, y: number}}>({});

  const handleCardMouseMove = (productId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const box = cardRefs.current[productId];
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setBorderPos(prev => ({ ...prev, [productId]: { x, y } }));
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((e.clientX - rect.left - centerX) / centerX) * 10;
    const rotateX = -((e.clientY - rect.top - centerY) / centerY) * 10;
    setCardStyles(prev => ({
      ...prev,
      [productId]: {
        transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` ,
        background: '#fff',
        transition: 'transform 0.18s cubic-bezier(.25,.46,.45,.94)',
        border: hoveredCard === productId
          ? '4px solid transparent'
          : '4px solid #fff',
        borderImage: hoveredCard === productId
          ? `radial-gradient(circle at ${(borderPos[productId]?.x ?? 50)}% ${(borderPos[productId]?.y ?? 50)}%, #a78bfa 0%, #7c3aed 60%, transparent 100%) 1` 
          : 'none',
        boxSizing: 'border-box',
      }
    }));
  };
  const handleCardMouseLeave = (productId: string) => {
    setHoveredCard(null);
    setCardStyles(prev => ({
      ...prev,
      [productId]: {
        transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)',
        background: '#fff',
        border: '4px solid #fff',
        borderImage: 'none',
        transition: 'transform 0.3s, border 0.3s',
        boxSizing: 'border-box',
      }
    }));
  };
  const handleCardMouseEnter = (productId: string) => setHoveredCard(productId);

  // Thêm hàm fetchUserInfo để đồng bộ dữ liệu user sau khi upload avatar
  const fetchUserInfo = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error && data) setUserInfo(data);
  };

  useEffect(() => {
    fetchUserInfo();
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => setAddresses(data || []));
  }, [user, modalOpen]);

  // Lấy tỉnh/thành
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setCities(data));
  }, []);

  // Lấy avatar từ userInfo
  useEffect(() => {
    if (userInfo?.avatar_url) {
      setAvatarUrl(userInfo.avatar_url);
      setAvatarError(false);
    }
  }, [userInfo]);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (!user || wishlist.length === 0) {
        setWishlistProducts([]);
        return;
      }
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', wishlist);
      if (!error && data) setWishlistProducts(data);
    };
    fetchWishlistProducts();
  }, [user, wishlist]);

  const handleSelect = async (address: string) => {
    setForm(f => ({ ...f, full_address: address }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
    if (!addressForm.city || !addressForm.district || !addressForm.ward || !addressForm.address_line) {
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Vui lòng nhập đầy đủ thông tin địa chỉ!',
        show: true
      }]);
      return;
    }

      const addressData = {
        user_id: user.id,
        city: addressForm.city,
        district: addressForm.district,
        ward: addressForm.ward,
        address_line: addressForm.address_line,
        label: addressForm.label || null,
        is_default: addressForm.is_default
      };

      let response;
    if (form.id) {
        response = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', form.id);
      } else {
        response = await supabase
          .from('addresses')
          .insert([addressData]);
      }

      if (response.error) {
        throw response.error;
      }

      setModalOpen(false);
      setNotifications(prev => [...prev, {
        type: 'success',
        message: form.id ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ thành công!',
        show: true
      }]);

      const { data, error: fetchError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      
        setAddresses(data || []);
    } catch (error) {
      console.error('Error saving address:', error);
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi xảy ra khi lưu địa chỉ. Vui lòng thử lại!',
        show: true
      }]);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteModalOpen(true);
    setAddressToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressToDelete);
      if (error) throw error;
      setAddresses(addresses.filter(a => a.id !== addressToDelete));
      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Xóa địa chỉ thành công!',
        show: true
      }]);
    } catch (error) {
      console.error('Error deleting address:', error);
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi xảy ra khi xóa địa chỉ. Vui lòng thử lại!',
        show: true
      }]);
    }
    setDeleteModalOpen(false);
    setAddressToDelete(null);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    
    try {
      // Reset tất cả địa chỉ về không mặc định
      const { error: resetError } = await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      if (resetError) throw resetError;

      // Set địa chỉ mới làm mặc định
      const { error: updateError } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (updateError) throw updateError;

      // Cập nhật state
    setAddresses(addresses.map(a => ({ ...a, is_default: a.id === id })));
      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Đã cập nhật địa chỉ mặc định!',
        show: true
      }]);
    } catch (error) {
      console.error('Error setting default address:', error);
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi xảy ra khi cập nhật địa chỉ mặc định. Vui lòng thử lại!',
        show: true
      }]);
    }
  };

  // Lấy danh sách địa chỉ khi component mount hoặc khi đổi trang
  useEffect(() => {
    if (!user) return;

    const fetchAddresses = async () => {
      try {
        // Lấy tổng số địa chỉ
        const { count } = await supabase
          .from('addresses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setTotalAddresses(count || 0);

        // Lấy địa chỉ theo trang
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .range(from, to);
        if (error) throw error;
        setAddresses(data || []);
      } catch (error) {
        setNotifications(prev => [...prev, {
          type: 'error',
          message: 'Lỗi khi tải danh sách địa chỉ',
          show: true
        }]);
      }
    };

    fetchAddresses();
  }, [user, currentPage, modalOpen]);

  // Đơn giản hóa xử lý lỗi ảnh
  const handleImageError = () => {
    setAvatarError(true);
    // Tự động chuyển sang ảnh mặc định
    setAvatarUrl(defaultAvatar);
  };

  // Đơn giản hóa lấy URL avatar
  const getValidAvatarUrl = (url: string | null): string => {
    if (!url || url === defaultAvatar) return defaultAvatar;
    return url;
  };
    
  // Đơn giản hóa render avatar
  const renderAvatar = () => {
    const avatarSrc = getValidAvatarUrl(avatarUrl);
    
    return (
      <div className="relative w-24 h-24">
        <img
          src={avatarSrc}
          alt="avatar"
          className="w-full h-full rounded-full object-cover border-4 border-primary-200 shadow-xl cursor-pointer"
          onClick={() => setShowAvatarModal(true)}
          onError={handleImageError}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    );
  };

  // Cập nhật thông tin cá nhân
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const updateData: any = {
      full_name: formData.full_name,
      phone: formData.phone,
      avatar_url: formData.avatar_url,
    };
    Object.keys(updateData).forEach(
      (key) => (updateData[key] === undefined || updateData[key] === null) && delete updateData[key]
    );
    const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
    setLoading(false);
    if (error) {
      setMessage(error.message || 'Cập nhật thất bại');
    } else {
      setMessage('Cập nhật thành công!');
      setIsEditing(false);
      window.location.reload();
    }
  };

  // Badge thành viên
  const badge = userInfo?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng';
  const badgeColor = userInfo?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500';

  // Khi chọn tỉnh/thành
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city_code = e.target.value;
    const city = cities.find(c => c.code === Number(city_code));
    setAddressForm(f => ({
      ...f,
      city: city.name,
      city_code,
      district: '',
      district_code: '',
      ward: '',
      ward_code: ''
    }));
    setDistricts([]);
    setWards([]);
    fetch(`https://provinces.open-api.vn/api/p/${city_code}?depth=2`)
      .then(res => res.json())
      .then(data => setDistricts(data.districts));
  };

  // Khi chọn quận/huyện
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const district_code = e.target.value;
    const district = districts.find(d => d.code === Number(district_code));
    setAddressForm(f => ({
      ...f,
      district: district.name,
      district_code,
      ward: '',
      ward_code: ''
    }));
    setWards([]);
    fetch(`https://provinces.open-api.vn/api/d/${district_code}?depth=2`)
      .then(res => res.json())
      .then(data => setWards(data.wards));
  };

  // Khi chọn phường/xã
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ward_code = e.target.value;
    const ward = wards.find(w => w.code === Number(ward_code));
    setAddressForm(f => ({
      ...f,
      ward: ward.name,
      ward_code
    }));
  };

  // Upload avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLoading(true);
    // Kiểm tra loại file hợp lệ
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Chỉ hỗ trợ file ảnh JPG, PNG, GIF, WEBP', show: true }
      ]);
      setLoading(false);
      return;
    }
    // Kiểm tra dung lượng file
    if (file.size > 10* 1024 * 1024) {
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Dung lượng ảnh tối đa 5MB', show: true }
      ]);
      setLoading(false);
      return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    // Không set header gì thêm, chỉ truyền đúng File
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) {
      console.log('Upload error:', uploadError);
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Lỗi upload ảnh', show: true }
      ]);
      setLoading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    setAvatarUrl(data.publicUrl);
    setFormData((f) => ({ ...f, avatar_url: data.publicUrl }));
    // Cập nhật avatar_url vào database
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id);
    if (updateError) {
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Lỗi cập nhật avatar', show: true }
      ]);
    } else {
      setNotifications(prev => [
        ...prev,
        { type: 'success', message: 'Cập nhật avatar thành công!', show: true }
      ]);
    }
    setLoading(false);
  };

  // Lấy danh sách đơn hàng của user
  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setOrders(data || []);
        setLoadingOrders(false);
      });
  }, [user]);

  // Thêm hàm hoàn tiền đơn hàng
  const handleRefund = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      if (error) throw error;
      setShowOrderModal(false);
      setSelectedOrder(null);
      setNotifications(prev => [...prev, { type: 'success', message: 'Đã hoàn tiền/hủy đơn thành công!', show: true }]);
      // Reload lại danh sách đơn hàng
      if (user) {
        setLoadingOrders(true);
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            setOrders(data || []);
            setLoadingOrders(false);
          });
      }
    } catch (err) {
      setNotifications(prev => [...prev, { type: 'error', message: 'Có lỗi khi hoàn tiền/hủy đơn!', show: true }]);
    }
  };

  // Thêm hàm gửi yêu cầu hoàn tiền
  const handleRefundRequest = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          refund_request: true,
          refund_status: 'pending',
          refund_reason: refundReason
        })
        .eq('id', orderId);

      if (error) throw error;

      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Yêu cầu hoàn tiền đã được gửi thành công!',
        show: true
      }]);
      setShowRefundRequestModal(false);
      setRefundReason('');
      // Reload danh sách đơn hàng
      if (user) {
        setLoadingOrders(true);
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            setOrders(data || []);
            setLoadingOrders(false);
          });
      }
    } catch (err) {
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi khi gửi yêu cầu hoàn tiền!',
        show: true
      }]);
    }
  };

  // Thêm hàm hủy yêu cầu hoàn tiền
  const handleCancelRefundRequest = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          refund_request: false,
          refund_status: null,
          refund_reason: null
        })
        .eq('id', orderId);
      if (error) throw error;
      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Đã hủy yêu cầu hoàn tiền!',
        show: true
      }]);
      setShowRefundRequestModal(false);
      setRefundReason('');
      // Reload danh sách đơn hàng
      if (user) {
        setLoadingOrders(true);
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            setOrders(data || []);
            setLoadingOrders(false);
          });
      }
    } catch (err) {
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi khi hủy yêu cầu hoàn tiền!',
        show: true
      }]);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage('');
    if (newPassword.length < 6) {
      setPwMessage('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage('Mật khẩu mới không khớp!');
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwMessage('Đổi mật khẩu thất bại: ' + error.message);
    } else {
      setPwMessage('Đổi mật khẩu thành công!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // State phân trang cho wishlist
  const [wishlistPage, setWishlistPage] = useState(1);
  const wishlistPerPage = 3;
  const wishlistTotalPages = Math.ceil(wishlistProducts.length / wishlistPerPage);
  const paginatedWishlist = wishlistProducts.slice((wishlistPage-1)*wishlistPerPage, wishlistPage*wishlistPerPage);

  // State phân trang cho orders
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 3;
  const ordersTotalPages = Math.ceil(orders.length / ordersPerPage);
  const paginatedOrders = orders.slice((ordersPage-1)*ordersPerPage, ordersPage*ordersPerPage);

  return (
    <div className="relative min-h-screen pt-32 pb-12 px-2 md:px-0 bg-gradient-to-br from-blue-100 via-purple-100 to-white overflow-hidden">
      {/* Hiệu ứng động 3D blob */}
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

      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
            className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8"
            onAnimationComplete={() => {
              setTimeout(() => {
                setNotifications(prev => prev.filter((_, i) => i !== index));
              }, 2500);
            }}
          >
            <div className={`relative p-4 rounded-xl shadow-2xl ${
              notification.type === 'success' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : notification.type === 'error'
                ? 'bg-gradient-to-r from-red-500 to-rose-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
            } text-white w-[280px] sm:w-[320px] md:w-[380px]`}>
              {/* Icon */}
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {notification.type === 'success' ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : notification.type === 'error' ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="pl-4">
                <h3 className="font-semibold text-base sm:text-lg mb-1">
                  {notification.type === 'success' 
                    ? 'Thành công!' 
                    : notification.type === 'error'
                    ? 'Lỗi!'
                    : 'Thông báo'}
                </h3>
                <p className="text-sm sm:text-base text-white/90">{notification.message}</p>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Modal xác nhận xóa địa chỉ */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa địa chỉ
              </h3>
              <p>Bạn có chắc chắn muốn xóa địa chỉ này không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDeleteModalOpen(false); setAddressToDelete(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-64 bg-gradient-to-br from-primary-500 to-purple-600 p-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-6">
            <motion.div
              initial={{ scale: 0.8, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              className="relative"
            >
                    {renderAvatar()}
                    <label className="absolute bottom-2 right-2 bg-white text-primary-600 rounded-full p-2 cursor-pointer shadow-lg hover:bg-primary-50 transition">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarChange}
                        disabled={loading}
                      />
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                        <path 
                          fill="currentColor" 
                          d="M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm7.5-4.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0ZM12 2v2m0 16v2m10-10h-2M4 12H2" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
              </label>
            </motion.div>
                  <div className="text-center mt-4">
                    <div className="text-lg font-bold text-white drop-shadow-lg">{userInfo?.full_name || 'Chưa cập nhật'}</div>
                    <div className="text-white/80 text-sm">{user?.email}</div>
              <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold text-white rounded-full shadow ${badgeColor}`}>{badge}</span>
            </div>
                </div>

                <div className="flex flex-col space-y-4">
                  {TABS.map((tab) => (
                <motion.button
                  key={tab.key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === tab.key
                          ? 'bg-white text-primary-700 shadow-lg'
                          : 'text-white hover:bg-white/10'
                      }`}
                >
                  {tab.icon}
                      <span className="font-medium">{tab.label}</span>
                </motion.button>
              ))}
                </div>
          </div>

              {/* Content */}
              <div className="flex-1 p-6">
          <AnimatePresence mode="wait">
                  {activeTab === 'info' && (
            <motion.div
                      key="info"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
            >
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-primary-700">Thông tin cá nhân</h2>
                  {message && <div className="mb-3 text-green-600 font-semibold text-center bg-green-50 rounded-lg py-2 shadow">{message}</div>}
                  <AnimatePresence>
                    {isEditing ? (
                      <motion.form
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                        onSubmit={handleSubmit}
                        className="space-y-4 max-w-lg mx-auto"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                          <input
                            type="text"
                            value={formData.full_name}
                            onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 shadow-sm cursor-not-allowed"
                          />
                        </div>
                        <div className="flex gap-4 mt-6">
                          <button type="submit" disabled={loading} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-semibold">
                            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                          </button>
                          <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 font-semibold">
                            Hủy
                          </button>
                        </div>
                      </motion.form>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.98, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                        className="space-y-4"
                      >
                        <div>
                                <span className="font-semibold text-gray-700">Họ và tên:</span> {userInfo?.full_name?.trim() ? userInfo.full_name : 'Chưa cập nhật'}
                        </div>
                        <div>
                                <span className="font-semibold text-gray-700">Số điện thoại:</span> {userInfo?.phone || 'Chưa cập nhật'}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Email:</span> {user?.email}
                        </div>
                        <button onClick={() => setIsEditing(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-semibold mt-4">
                          Chỉnh sửa thông tin
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                    </motion.div>
              )}

              {activeTab === 'address' && (
                <motion.div
                      key="address"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-primary-700">Địa chỉ giao hàng</h2>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { 
                            setModalOpen(true); 
                            setForm({ 
                              id: '', 
                              label: '', 
                              type: '', 
                              full_address: '', 
                              lat: null, 
                              lng: null, 
                              country: 'VN', 
                              is_default: false 
                            }); 
                          }}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg shadow-lg hover:bg-primary-600 transition-colors"
                        >
                          Thêm địa chỉ mới
                        </motion.button>
                      </div>

                  {addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                      <MapPin size={64} className="text-primary-400 mb-4" />
                      <div className="text-lg font-semibold text-primary-600 mb-2">Bạn chưa có địa chỉ giao hàng nào</div>
                      <div className="text-gray-500 mb-4">Hãy thêm địa chỉ để thuận tiện cho việc đặt hàng!</div>
                    </div>
                  ) : (
                        <>
                          <div className="space-y-4">
                            {addresses
                              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                              .map((address) => (
                          <motion.div
                            key={address.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">
                                {address.type === 'home' ? '🏠' : address.type === 'office' ? '🏢' : address.type === 'gym' ? '🏋️' : '📍'}
                              </span>
                              <span className="font-bold text-lg text-primary-700">{address.label || address.type || 'Địa chỉ'}</span>
                              {address.is_default && (
                                <span className="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-full">Mặc định</span>
                              )}
                            </div>
                                  <div className="font-semibold text-gray-800 mb-1">
                                    {address.address_line}, {address.ward}, {address.district}, {address.city}
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => { 
                                        setModalOpen(true); 
                                        setForm(address); 
                                      }}
                                      className="px-3 py-1 rounded bg-primary-100 text-primary-700 font-semibold hover:bg-primary-200 transition"
                                    >
                                      Sửa
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleDelete(address.id)}
                                      className="px-3 py-1 rounded bg-red-100 text-red-600 font-semibold hover:bg-red-200 transition"
                                    >
                                      Xóa
                                    </motion.button>
                              {!address.is_default && (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSetDefault(address.id)}
                                        className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
                                      >
                                        Đặt làm mặc định
                                      </motion.button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                          {/* Pagination */}
                          {totalAddresses > itemsPerPage && (
                            <div className="flex justify-center mt-6">
                              <div className="flex space-x-2">
                                {Array.from({ length: Math.min(Math.ceil(totalAddresses / itemsPerPage), maxPages) }, (_, i) => (
                                  <motion.button
                                    key={i + 1}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 rounded-lg ${
                                      currentPage === i + 1
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {i + 1}
                                  </motion.button>
                                ))}
                              </div>
                              </div>
                            )}
                        </>
                      )}

                      {/* Address Modal */}
                      <AnimatePresence>
                        {modalOpen && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                          >
                            <motion.form
                              initial={{ scale: 0.9, y: 20 }}
                              animate={{ scale: 1, y: 0 }}
                              exit={{ scale: 0.9, y: 20 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              onSubmit={handleSave}
                              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg space-y-4"
                            >
                              <h3 className="text-xl font-bold mb-4 text-primary-700">
                                {form.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Tỉnh/Thành phố</label>
                                  <select 
                                    value={addressForm.city_code} 
                                    onChange={handleCityChange} 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                  >
                                    <option value="">Chọn tỉnh/thành</option>
                                    {cities.map(city => (
                                      <option key={city.code} value={city.code}>{city.name}</option>
                                    ))}
                                  </select>
                          </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Quận/Huyện</label>
                                  <select 
                                    value={addressForm.district_code} 
                                    onChange={handleDistrictChange} 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                                    disabled={!addressForm.city_code}
                                  >
                                    <option value="">Chọn quận/huyện</option>
                                    {districts.map(d => (
                                      <option key={d.code} value={d.code}>{d.name}</option>
                                    ))}
                                  </select>
                          </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Phường/Xã</label>
                                  <select 
                                    value={addressForm.ward_code} 
                                    onChange={handleWardChange} 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                                    disabled={!addressForm.district_code}
                              >
                                    <option value="">Chọn phường/xã</option>
                                    {wards.map(w => (
                                      <option key={w.code} value={w.code}>{w.name}</option>
                                    ))}
                                  </select>
                          </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Địa chỉ cụ thể</label>
                            <input
                                    value={addressForm.address_line} 
                                    onChange={e => setAddressForm(f => ({ ...f, address_line: e.target.value }))} 
                                    required 
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    placeholder="Số nhà, tên đường, tòa nhà..." 
                            />
                          </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Nhãn địa chỉ</label>
                                  <input 
                                    value={addressForm.label} 
                                    onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                                    placeholder="Nhà, Công ty, ..." 
                                  />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                                    checked={addressForm.is_default} 
                                    onChange={e => setAddressForm(f => ({ ...f, is_default: e.target.checked }))} 
                              id="is_default"
                            />
                            <label htmlFor="is_default" className="text-sm">Đặt làm mặc định</label>
                          </div>
                              </div>
                              <div className="mt-6 flex justify-end gap-3">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => setModalOpen(false)}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                  Hủy
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="submit"
                                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                                >
                              Lưu
                                </motion.button>
                          </div>
                        </motion.form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === 'orders' && (
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                >
                  <h2 className="text-2xl font-bold mb-4 text-primary-700">Đơn hàng của tôi</h2>
                  {loadingOrders ? (
                    <div className="text-gray-500">Đang tải đơn hàng...</div>
                  ) : orders.length === 0 ? (
                    <div className="text-gray-500">Bạn chưa có đơn hàng nào.</div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {paginatedOrders.map(order => (
                          <div key={order.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 cursor-pointer hover:shadow-lg transition"
                            onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                              <div className="font-semibold text-primary-700">Mã đơn: {order.id}</div>
                              <div className="text-gray-500 text-sm">Ngày: {new Date(order.created_at).toLocaleString('vi-VN')}</div>
                            </div>
                            <div className="flex flex-wrap gap-4 items-center mb-2">
                              <div className="text-sm">Tổng tiền: <span className="font-bold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                              <div className="text-sm">Trạng thái: <span className="font-semibold text-blue-600">{order.status}</span></div>
                              {order.refund_request && (
                                <div className="text-sm">
                                  Yêu cầu hoàn tiền: 
                                  <span className={`font-semibold ${
                                    order.refund_status === 'pending' ? 'text-yellow-600' :
                                    order.refund_status === 'approved' ? 'text-green-600' :
                                    'text-red-600'
                                  }`}>
                                    {order.refund_status === 'pending' ? 'Đang chờ duyệt' :
                                     order.refund_status === 'approved' ? 'Đã duyệt' :
                                     'Đã từ chối'}
                                  </span>
                                  {/* Nếu đang chờ duyệt thì cho phép hủy yêu cầu */}
                                  {order.refund_status === 'pending' && (
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); handleCancelRefundRequest(order.id); }}
                                      className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-semibold hover:bg-red-200"
                                    >Hủy yêu cầu</button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 mb-2">Sản phẩm:</div>
                            <ul className="pl-4 list-disc text-sm text-gray-700">
                              {order.items && Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                                <li key={idx}>
                                  {item.name} x {item.quantity} ({item.price?.toLocaleString('vi-VN')}đ)
                                </li>
                              ))}
                            </ul>
                            {/* Nút yêu cầu hoàn tiền */}
                            {order.status === 'confirmed' && !order.refund_request && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setSelectedOrder(order); setShowRefundRequestModal(true); }}
                                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs font-semibold"
                              >
                                Yêu cầu hoàn tiền
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Phân trang orders */}
                      {ordersTotalPages > 1 && (
                        <div className="flex justify-center mt-8 gap-2">
                          {Array.from({ length: ordersTotalPages }, (_, i) => (
                            <button
                              key={i+1}
                              onClick={() => setOrdersPage(i+1)}
                              className={`w-10 h-10 rounded-lg font-bold ${ordersPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {i+1}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {/* Modal chi tiết đơn hàng */}
                  <AnimatePresence>
                    {showOrderModal && selectedOrder && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                      >
                        <motion.div
                          initial={{ scale: 0.92, rotateY: 12, y: 40, opacity: 0 }}
                          animate={{ scale: 1, rotateY: 0, y: 0, opacity: 1 }}
                          exit={{ scale: 0.92, rotateY: 12, y: 40, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                          className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative border border-primary-100"
                          style={{ boxShadow: '0 12px 48px 0 rgba(80,0,200,0.18)' }}
                        >
                          <button
                            onClick={() => setShowOrderModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold transition"
                          >×</button>
                          <h3 className="text-2xl font-extrabold mb-6 text-primary-700 drop-shadow">Chi tiết đơn hàng</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="space-y-2 text-sm text-gray-700">
                              <div>Mã đơn: <span className="font-semibold">{selectedOrder.id}</span></div>
                              <div>Ngày đặt: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                              <div>Trạng thái: <span className="font-semibold text-blue-600">{selectedOrder.status}</span></div>
                              <div>Tổng tiền: <span className="font-bold text-primary-600">{selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                              <div>Giảm giá: <span className="text-green-600">{selectedOrder.discount?.toLocaleString('vi-VN') || 0}đ</span></div>
                              <div>Phí vận chuyển: <span className="text-gray-800">{selectedOrder.shipping_fee?.toLocaleString('vi-VN') || 0}đ</span></div>
                              <div>Phương thức thanh toán: <span className="text-gray-800">{selectedOrder.payment_method || '---'}</span></div>
                              <div>Địa chỉ giao hàng: <span className="text-gray-800">{selectedOrder.address_id || '---'}</span></div>
                              {selectedOrder.note && (
                                <div>Ghi chú: <span className="text-gray-800">{selectedOrder.note}</span></div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="font-semibold text-primary-700 mb-2">Sản phẩm:</div>
                              <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-2">
                                {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                                  <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.04, rotateY: 4 }}
                                    className="flex gap-4 items-center bg-primary-50 rounded-xl p-3 shadow-sm hover:shadow-lg transition cursor-pointer"
                                  >
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-primary-100 shadow">
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                        style={{ boxShadow: '0 2px 8px 0 rgba(80,0,200,0.10)' }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-primary-700 truncate">{item.name}</div>
                                      <div className="text-xs text-gray-500 truncate">{item.color && <>Màu: {item.color} </>}{item.size && <>- Size: {item.size}</>}</div>
                                      <div className="text-sm">Số lượng: <span className="font-bold">{item.quantity}</span></div>
                                    </div>
                                    <div className="font-bold text-primary-600 whitespace-nowrap">{item.price?.toLocaleString('vi-VN')}đ</div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-6 justify-end">
                            {selectedOrder.status === 'confirmed' && (
                              <button
                                onClick={() => handleRefund(selectedOrder.id)}
                                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-semibold"
                              >Hoàn tiền</button>
                            )}
                            {selectedOrder.status === 'pending' && (
                              <button
                                onClick={() => handleRefund(selectedOrder.id)}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
                              >Hủy đơn</button>
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === 'wishlist' && (
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                >
                  <h2 className="text-2xl font-bold mb-4 text-primary-700">Sản phẩm yêu thích</h2>
                  {wishlistLoading ? (
                    <div className="text-gray-500">Đang tải danh sách yêu thích...</div>
                  ) : wishlistProducts.length === 0 ? (
                    <div className="text-gray-500">Bạn chưa có sản phẩm yêu thích nào.</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {paginatedWishlist.map(product => (
                          <div
                            key={product.id}
                            ref={el => cardRefs.current[product.id] = el}
                            className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center relative group w-full max-w-xs mx-auto min-h-[420px]"
                            style={cardStyles[product.id]}
                            onMouseMove={e => handleCardMouseMove(product.id, e)}
                            onMouseLeave={() => handleCardMouseLeave(product.id)}
                            onMouseEnter={() => handleCardMouseEnter(product.id)}
                          >
                            <motion.button
                              onClick={async () => {
                                await removeFromWishlist(product.id);
                                fetchWishlist();
                              }}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-700 z-10"
                              title="Bỏ yêu thích"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Heart size={28} className="fill-red-500" />
                            </motion.button>
                            <motion.img
                              src={product.image_url || (Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : 'https://via.placeholder.com/300x300?text=No+Image')}
                              alt={product.name}
                              className="w-40 h-40 object-cover rounded-xl mb-3 border"
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            />
                            <div className="font-semibold text-primary-700 text-center line-clamp-2 mb-2 text-lg">{product.name}</div>
                            <div className="text-primary-600 font-bold mb-3 text-xl">{product.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
                            <div className="flex-1" />
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-full flex justify-center"
                            >
                              <Link to={`/products/${product.id}`} className="mt-auto px-5 py-2 bg-primary-500 text-white rounded-lg font-semibold shadow hover:bg-primary-600 transition-all text-base w-full text-center">Xem chi tiết</Link>
                            </motion.div>
                          </div>
                        ))}
                      </div>
                      {/* Phân trang wishlist */}
                      {wishlistTotalPages > 1 && (
                        <div className="flex justify-center mt-8 gap-2">
                          {Array.from({ length: wishlistTotalPages }, (_, i) => (
                            <button
                              key={i+1}
                              onClick={() => setWishlistPage(i+1)}
                              className={`w-10 h-10 rounded-lg font-bold ${wishlistPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {i+1}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'password' && (
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                >
                  <h2 className="text-2xl font-bold mb-4 text-primary-700">Đổi mật khẩu</h2>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block mb-1">Mật khẩu mới</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                      <label className="block mb-1">Xác nhận mật khẩu mới</label>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className="w-full border rounded px-3 py-2" />
                    </div>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded" disabled={pwLoading}>
                      {pwLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </button>
                    {pwMessage && <div className={`mt-2 ${pwMessage.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>{pwMessage}</div>}
                  </form>
                </motion.div>
              )}
          </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal yêu cầu hoàn tiền */}
      <AnimatePresence>
        {showRefundRequestModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-4 text-primary-700">Yêu cầu hoàn tiền</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do yêu cầu hoàn tiền</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Nhập lý do yêu cầu hoàn tiền..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRefundRequestModal(false);
                    setRefundReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleRefundRequest(selectedOrder.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 