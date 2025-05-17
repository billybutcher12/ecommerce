import React, { useState, useEffect } from 'react';
import { motion} from 'framer-motion';
import { useCart } from '../hooks/useCart';
import { toast } from 'react-hot-toast';
import { CreditCard, Truck, MapPin, Package, Tag, User, ChevronDown, ChevronUp, Clock} from 'lucide-react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabase';



interface Address {
  id: string;
  user_id: string;
  address_line: string;
  city: string;
  district: string;
  ward: string;
  is_default: boolean;
  label?: string;
  created_at?: string;
}

interface Voucher {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  valid_from?: string;
  valid_to?: string;
  quantity: number;
  used: number;
  is_active: boolean;
  applies_to: 'all' | 'category' | 'product' | 'specific_categories' | 'specific_products';
  applied_items?: string[];
  created_at?: string;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
  name: string;
  image: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimated_days: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Order {
  id?: string;
  user_id: string;
  address_id: string;
  shipping_method_id: string;
  payment_method_id: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  voucher_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at?: string;
}

// Dữ liệu mẫu cho phương thức vận chuyển
const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Giao hàng tiêu chuẩn',
    description: 'Giao hàng trong 3-5 ngày',
    price: 30000,
    estimated_days: '3-5 ngày'
  },
  {
    id: 'express',
    name: 'Giao hàng nhanh',
    description: 'Giao hàng trong ngày',
    price: 90000,
    estimated_days: 'Trong ngày'
  }
];

// Dữ liệu mẫu cho phương thức thanh toán
const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'cod',
    name: 'Thanh toán khi nhận hàng (COD)',
    description: 'Thanh toán bằng tiền mặt khi nhận hàng',
    icon: '💵'
  }
];

function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [profile, setProfile] = useState<any>(null);
  let user = useUser();
  let userId = user?.id;
  if (!userId) {
    userId = localStorage.getItem('sb-user-id') || undefined;
  }
  // Log user id để debug
  console.log('CheckoutPage userId:', userId);
  // Nếu không có user id, chuyển hướng về login
  if (!userId) {
    window.location.href = '/login';
    return null;
  }
  const userIdStr = String(userId);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod>(SHIPPING_METHODS[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVouchers, setAppliedVouchers] = useState<Voucher[]>([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [showVoucherList, setShowVoucherList] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);
  const [addressErrorMsg, setAddressErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!userIdStr) return;
    
    // Lấy thông tin user
    supabase
      .from('users')
      .select('*')
      .eq('id', userIdStr)
      .single()
      .then(({ data, error }) => {
        console.log('User data:', data, error);
        if (!error && data) setProfile(data);
        else setProfile(null);
      });

    // Lấy địa chỉ
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userIdStr)
      .order('is_default', { ascending: false })
      .then(({ data, error }) => {
        console.log('Address data:', data, error);
        if (!error && data && data.length > 0) {
      setAddresses(data);
          setSelectedAddress(data.find(addr => addr.is_default) || data[0]);
        } else {
          setAddresses([]);
          setSelectedAddress(null);
      }
      });
  }, [userIdStr]);

  // Luôn load voucher liên quan khi items thay đổi
  useEffect(() => {
    loadAvailableVouchers();
    // eslint-disable-next-line
  }, [items]);

  // Lấy voucher liên quan đến giỏ hàng
  const loadAvailableVouchers = async () => {
    setVoucherLoading(true);
    try {
      const now = new Date();
      // Lấy id sản phẩm trong giỏ
      const productIds = items.map(item => item.product_id);
      // Lấy category_id của từng sản phẩm
      let categoryIds: string[] = [];
      if (productIds.length > 0) {
        const { data: products } = await supabase.from('products').select('id, category_id').in('id', productIds);
        categoryIds = (products || []).map(p => p.category_id);
      }
      const { data: vouchers, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (vouchers) {
        // Lọc voucher liên quan
        const validVouchers = vouchers.filter(voucher => {
          // Kiểm tra ngày hiệu lực
          const from = voucher.valid_from ? new Date(voucher.valid_from) : null;
          const to = voucher.valid_to ? new Date(voucher.valid_to) : null;
          if (from && from > now) return false;
          if (to && to < now) return false;
          if (voucher.used >= voucher.quantity) return false;
          if (voucher.min_order_value && subtotal < voucher.min_order_value) return false;
          // Kiểm tra quyền truy cập voucher
          if (voucher.user_id && voucher.user_id !== user?.id) return false;
          // Chỉ lấy voucher liên quan
          if (voucher.applies_to === 'all') return true;
          if (voucher.applies_to === 'specific_categories') {
            // Có ít nhất 1 category trong giỏ hàng nằm trong applied_items
            return voucher.applied_items?.some((catId: string) => categoryIds.includes(catId));
          }
          if (voucher.applies_to === 'specific_products') {
            // Có ít nhất 1 sản phẩm trong giỏ hàng nằm trong applied_items
            return voucher.applied_items?.some((pid: string) => productIds.includes(pid));
          }
          return false;
        });
        setAvailableVouchers(validVouchers);
      }
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast.error('Không thể tải danh sách mã giảm giá');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleSelectVoucher = (voucher: Voucher) => {
    // Nếu đã áp dụng mã này thì không thêm nữa
    if (appliedVouchers.some(v => v.id === voucher.id)) {
      toast('Mã này đã được áp dụng!');
      return;
    }
    setAppliedVouchers(vs => [...vs, voucher]);
    toast.success('Áp dụng mã giảm giá thành công!');
  };

  const applyVoucher = async () => {
    if (!voucherCode) return;
    setVoucherLoading(true);
    try {
      const { data: voucher, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!voucher) {
        toast.error('Không tìm thấy mã giảm giá này hoặc đã hết hiệu lực!');
        return;
      }
      const now = new Date();
      if (voucher.valid_from && new Date(voucher.valid_from) > now) {
        toast.error('Mã giảm giá chưa có hiệu lực');
        return;
      }
      if (voucher.valid_to && new Date(voucher.valid_to) < now) {
        toast.error('Mã giảm giá đã hết hạn');
        return;
      }
      if (voucher.used >= voucher.quantity) {
        toast.error('Mã giảm giá đã hết lượt sử dụng');
        return;
      }
      if (voucher.min_order_value && subtotal < voucher.min_order_value) {
        toast.error(`Đơn hàng tối thiểu ${voucher.min_order_value.toLocaleString('vi-VN')}đ`);
        return;
      }
      // Kiểm tra quyền truy cập voucher
      if (voucher.user_id && voucher.user_id !== user?.id) {
        toast.error('Bạn không có quyền sử dụng mã giảm giá này');
        return;
      }
      // Kiểm tra loại áp dụng
      let eligible = false;
      if (voucher.applies_to === 'all') eligible = true;
      if (voucher.applies_to === 'specific_categories') {
        const productIds = items.map(item => item.product_id);
        const { data: products } = await supabase.from('products').select('id, category_id').in('id', productIds);
        const eligibleItems = items.filter(item => {
          const prod = products?.find(p => p.id === item.product_id);
          return prod && voucher.applied_items?.includes(prod.category_id);
        });
        eligible = eligibleItems.length > 0;
      }
      if (voucher.applies_to === 'specific_products') {
        const eligibleItems = items.filter(item => voucher.applied_items?.includes(item.product_id));
        eligible = eligibleItems.length > 0;
      }
      if (!eligible) {
        toast.error('Mã giảm giá này không áp dụng cho sản phẩm trong giỏ hàng!');
        return;
      }
      // Nếu đã áp dụng mã này thì không thêm nữa
      if (appliedVouchers.some(v => v.id === voucher.id)) {
        toast('Mã này đã được áp dụng!');
        return;
      }
      setAppliedVouchers(vs => [...vs, voucher]);
      toast.success('Áp dụng mã giảm giá thành công!');
    } catch (error) {
      console.error('Error applying voucher:', error);
      toast.error('Có lỗi xảy ra khi áp dụng mã giảm giá');
    } finally {
      setVoucherLoading(false);
    }
  };

  const calculateDiscount = () => {
    if (appliedVouchers.length === 0) return 0;
    
    const discount = appliedVouchers.reduce((total, voucher) => {
      const discount = voucher.discount_type === 'percent'
        ? (subtotal * voucher.discount_value) / 100
        : voucher.discount_value;
      return total + Math.min(discount, voucher.max_discount || Infinity);
    }, 0);

    return discount;
  };

  const calculateTotal = () => {
    return subtotal - calculateDiscount() + selectedShippingMethod.price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdStr) {
      toast.error('Vui lòng đăng nhập để tiếp tục');
      return;
    }

    if (!selectedAddress) {
      toast.error('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        user_id: userIdStr,
        address_id: selectedAddress.id,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          color: item.color,
          size: item.size,
          name: item.name,
          image: item.image
        })),
        subtotal: subtotal,
        shipping_fee: selectedShippingMethod.price,
        discount: calculateDiscount(),
        total_amount: calculateTotal(),
        payment_method: selectedPaymentMethod.id,
        voucher_id: appliedVouchers.length > 0 ? appliedVouchers[0].id : null,
        status: 'pending'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      if (appliedVouchers.length > 0) {
        const { error: voucherError } = await supabase
          .from('vouchers')
          .update({ used: appliedVouchers[0].used + 1 })
          .eq('id', appliedVouchers[0].id);

        if (voucherError) {
          console.error('Error updating voucher usage:', voucherError);
        }
      }

      toast.success('Đặt hàng thành công!');
      await clearCart();
      window.location.href = '/profile?tab=orders';
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Có lỗi xảy ra khi đặt hàng');
    } finally {
      setLoading(false);
    }
  };

  // Render phần thông tin cá nhân chỉ đọc
  const renderUserInfo = () => (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-white p-8 rounded-2xl shadow-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <User className="text-primary-600" size={24} />
        <h2 className="text-xl font-semibold text-primary-700">Thông tin người đặt</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
          <input
            type="text"
            value={profile?.full_name || ''}
            readOnly
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
            placeholder="Chưa có thông tin"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={profile?.email || ''}
            readOnly
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
            placeholder="Chưa có thông tin"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <input
            type="tel"
            value={profile?.phone || ''}
            readOnly
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
            placeholder="Chưa có thông tin"
          />
        </div>
      </div>
    </motion.div>
  );

  // Render phần địa chỉ giao hàng chỉ đọc
  const renderAddressInfo = () => (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-white p-8 rounded-2xl shadow-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="text-primary-600" size={24} />
        <h2 className="text-xl font-semibold text-primary-700">Địa chỉ giao hàng</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
          <input
            type="text"
            value={selectedAddress?.address_line || ''}
            readOnly
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
            placeholder="Chưa có thông tin"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
            <input
              type="text"
              value={selectedAddress?.city || ''}
              readOnly
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
              placeholder="Chưa có thông tin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
            <input
              type="text"
              value={selectedAddress?.district || ''}
              readOnly
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
              placeholder="Chưa có thông tin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
            <input
              type="text"
              value={selectedAddress?.ward || ''}
              readOnly
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
              placeholder="Chưa có thông tin"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
          <input
            type="text"
            value={selectedAddress?.label || ''}
            readOnly
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
            placeholder="Không có ghi chú"
          />
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 pt-24 pb-16 max-w-3xl"
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
        Thanh toán
      </h1>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Order Summary */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 md:p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Package className="text-primary-600" size={24} />
            <h2 className="text-lg md:text-xl font-semibold text-primary-700">Đơn hàng của bạn</h2>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    {item.color} - {item.size} x {item.quantity}
                  </p>
                  <p className="font-medium text-primary-600 mt-1">
                    {(item.price * item.quantity).toLocaleString()}đ
                  </p>
                </div>
              </div>
            ))}

            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{selectedShippingMethod.price.toLocaleString()}đ</span>
              </div>
              {appliedVouchers.length > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{calculateDiscount().toLocaleString()}đ</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Tổng cộng</span>
                <span className="text-primary-600">{calculateTotal().toLocaleString()}đ</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 justify-center mt-2">
              <Truck size={16} />
              <span>Giao hàng miễn phí cho đơn hàng từ 500.000đ</span>
            </div>
          </div>
        </motion.div>

        {/* Voucher Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 md:p-6 border-t border-gray-200"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag className="text-primary-600" size={24} />
              <h2 className="text-lg md:text-xl font-semibold text-primary-700">Mã giảm giá</h2>
        </div>
        {availableVouchers.length > 0 && (
              <button
            onClick={() => setShowVoucherList(!showVoucherList)}
            className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            {showVoucherList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                <span className="hidden md:inline">{availableVouchers.length} mã giảm giá</span>
              </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={voucherCode}
          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Nhập mã giảm giá"
        />
        <button
          onClick={applyVoucher}
          disabled={voucherLoading || !voucherCode}
          className="px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {voucherLoading ? 'Đang áp dụng...' : 'Áp dụng'}
        </button>
      </div>
      {/* Hiển thị voucher liên quan ngay dưới ô nhập mã */}
      {availableVouchers.length > 0 && (
        <div className="mt-3 space-y-2">
          {availableVouchers.map((voucher) => (
            <div
              key={voucher.id}
              className="p-3 rounded-xl border border-primary-200 bg-primary-50 flex justify-between items-center gap-2"
            >
              <div>
                <p className="font-semibold text-primary-700">{voucher.code}</p>
                <p className="text-sm text-primary-600">
                  Giảm {voucher.discount_type === 'percent'
                    ? `${voucher.discount_value}%`
                    : `${voucher.discount_value.toLocaleString('vi-VN')}đ`}
                </p>
                {voucher.applies_to === 'specific_categories' && (
                  <p className="text-xs text-gray-500 mt-1">Áp dụng cho danh mục trong giỏ hàng</p>
                )}
                {voucher.applies_to === 'specific_products' && (
                  <p className="text-xs text-gray-500 mt-1">Áp dụng cho sản phẩm trong giỏ hàng</p>
                )}
                {voucher.min_order_value && (
                  <p className="text-xs text-gray-500 mt-1">
                    Đơn tối thiểu {voucher.min_order_value.toLocaleString('vi-VN')}đ
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs text-gray-500">
                  HSD: {new Date(voucher.valid_to || '').toLocaleDateString('vi-VN')}
                </p>
                <button
                  className="px-2 py-1 bg-primary-500 text-white rounded text-xs font-semibold hover:bg-primary-600"
                  onClick={() => handleSelectVoucher(voucher)}
                  disabled={appliedVouchers.some(v => v.id === voucher.id)}
                >
                  {appliedVouchers.some(v => v.id === voucher.id) ? 'Đã áp dụng' : 'Áp dụng'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {appliedVouchers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-primary-50 rounded-xl"
        >
          <div className="flex flex-col gap-2">
            {appliedVouchers.map(voucher => (
              <div key={voucher.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary-700">{voucher.code}</p>
                  <p className="text-sm text-primary-600">
                    Giảm {voucher.discount_type === 'percent'
                      ? `${voucher.discount_value}%`
                      : `${voucher.discount_value.toLocaleString('vi-VN')}đ`}
                  </p>
                </div>
                <button
                  onClick={() => setAppliedVouchers(vs => vs.filter(v => v.id !== voucher.id))}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Hủy
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>

          {/* User Information */}
        {renderUserInfo()}

          {/* Shipping Address */}
        {renderAddressInfo()}

        {/* Shipping Method */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 md:p-6 border-t border-gray-200"
        >
            <div className="flex items-center gap-3 mb-6">
            <Truck className="text-primary-600" size={24} />
            <h2 className="text-lg md:text-xl font-semibold text-primary-700">Phương thức vận chuyển</h2>
            </div>

            <div className="space-y-4">
            {SHIPPING_METHODS.map((method) => (
              <div
                key={method.id}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedShippingMethod.id === method.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
                onClick={() => setSelectedShippingMethod(method)}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{method.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Clock size={16} />
                      <span>{method.description}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-700">
                      {method.price.toLocaleString('vi-VN')}đ
                    </p>
                    <p className="text-sm text-gray-500">{method.estimated_days}</p>
                  </div>
                </div>
              </div>
              ))}
            </div>
        </motion.div>

        {/* Payment Method */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 md:p-6 border-t border-gray-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="text-primary-600" size={24} />
            <h2 className="text-lg md:text-xl font-semibold text-primary-700">Phương thức thanh toán</h2>
          </div>

          <div className="space-y-4">
            {PAYMENT_METHODS.map((method) => (
              <div
                key={method.id}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedPaymentMethod.id === method.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
                onClick={() => setSelectedPaymentMethod(method)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{method.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800">{method.name}</p>
                    <p className="text-sm text-gray-600">{method.description}</p>
              </div>
                </div>
              </div>
            ))}
              </div>
        </motion.div>

            {/* Submit Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="sticky bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 z-30"
        >
          <button
              onClick={handleSubmit}
              disabled={loading || items.length === 0}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
              </>
              ) : (
              <>
                  <CreditCard size={20} />
                <span>Đặt hàng ({calculateTotal().toLocaleString()}đ)</span>
              </>
              )}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default CheckoutPage;