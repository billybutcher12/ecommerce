import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {  Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-hot-toast';
import { User, Package, Settings as  Menu, X, Image as ImageIcon, LayoutDashboard, List, ShoppingCart, Users, Bell, Download, Mail, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Pagination from '../../components/shared/Pagination';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';


// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_featured: boolean;
  category_id: string | null;
  stock: number;
  created_at: string;
  categories?: { name: string };
  sold?: number;
  colors?: string[];
  sizes?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  refund_request?: boolean;
  refund_status?: 'pending' | 'approved' | 'rejected';
  refund_amount?: number;
  refund_reason?: string;
  refund_date?: string;
  user?: {
    email: string;
    full_name: string;
  };
}

interface OrderDetail {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topSpendingCustomer: {
    name: string;
    total: number;
  };
  orderStatus: {
    pending: number;
    completed: number;
    cancelled: number;
  };
  lowStockProducts: Product[];
  topSellingProducts: {
    product: Product;
    quantity: number;
    revenue: number;
  }[];
  previousPeriodRevenue: number;
  revenueChange: number;
}

// Animation variants
const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

const tabVariants = {
  active: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    borderRight: '4px solid #4F46E5',
    transition: { duration: 0.3 }
  },
  inactive: {
    backgroundColor: 'transparent',
    color: '#6B7280',
    borderRight: '4px solid transparent',
    transition: { duration: 0.3 }
  }
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3
    }
  }
};

// Time period options
const timePeriods = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'thisWeek' },
  { label: 'Tháng này', value: 'thisMonth' },
  { label: 'Quý này', value: 'thisQuarter' },
  { label: 'Năm nay', value: 'thisYear' },
  { label: 'Tùy chỉnh', value: 'custom' }
];

// Helper functions
const getDateRange = (period: string, customRange?: { start: Date; end: Date }) => {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    case 'thisWeek':
      return {
        start: startOfWeek(now, { locale: vi }),
        end: endOfWeek(now, { locale: vi })
      };
    case 'thisMonth':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case 'thisQuarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: new Date(now.getFullYear(), (quarter + 1) * 3, 0)
      };
    case 'thisYear':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31)
      };
    case 'custom':
      return customRange || {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Hàm dịch trạng thái đơn hàng sang tiếng Việt
function translateOrderStatus(status: string) {
  switch (status) {
    case 'pending': return 'chờ duyệt';
    case 'confirmed': return 'đã duyệt';
    case 'cancelled': return 'đã hủy';
    default: return status;
  }
}

// Hàm chuyển tiếng Việt có dấu sang không dấu
function removeVietnameseTones(str: string) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toLowerCase();
}

const AdminPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname.split('/admin/')[1] || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<{
    type: 'warning' | 'info' | 'error';
    message: string;
  }[]>([]);
  // State tìm kiếm riêng cho từng tab
  const [searchProducts, setSearchProducts] = useState('');
  const [searchCategories, setSearchCategories] = useState('');
  const [searchVouchers, setSearchVouchers] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard /> },
    { id: 'products', label: 'Sản phẩm', icon: <Package size={20} /> },
    { id: 'categories', label: 'Danh mục', icon: <List size={20} /> },
    { id: 'orders', label: 'Đơn hàng', icon: <ShoppingCart size={20} /> },
    { id: 'users', label: 'Khách hàng', icon: <Users size={20} /> },
    { id: 'voucher', label: 'Voucher', icon: <Mail size={20} /> },
  ];

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, customDateRange]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const dateRange = getDateRange(selectedPeriod, customDateRange);
      const previousDateRange = {
        start: subMonths(dateRange.start, 1),
        end: subMonths(dateRange.end, 1)
      };

      // Fetch orders first
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at, user_id, items')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (ordersError) throw ordersError;

      // Then fetch users for those orders
      const userIds = [...new Set((orders || []).map(o => o.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Fetch previous period orders
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', previousDateRange.start.toISOString())
        .lte('created_at', previousDateRange.end.toISOString());

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Map users to orders
      const ordersWithUsers = orders?.map(order => ({
        ...order,
        user: users?.find(u => u.id === order.user_id)
      }));

      // Calculate statistics
      const stats: DashboardStats = {
        totalRevenue: ordersWithUsers?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        totalOrders: ordersWithUsers?.length || 0,
        totalCustomers: userIds.length,
        newCustomers: 0,
        returningCustomers: 0,
        topSpendingCustomer: {
          name: '',
          total: 0
        },
        orderStatus: {
          pending: ordersWithUsers?.filter(o => o.status === 'pending').length || 0,
          completed: ordersWithUsers?.filter(o => o.status === 'confirmed').length || 0,
          cancelled: ordersWithUsers?.filter(o => o.status === 'cancelled').length || 0
        },
        lowStockProducts: products?.filter(p => p.stock < 10) || [],
        topSellingProducts: [],
        previousPeriodRevenue: previousOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        revenueChange: 0
      };

      // Calculate top selling products
      const productSales: Record<string, { product: Product; quantity: number; revenue: number }> = {};
      ordersWithUsers?.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (!item.product_id) return;
            if (!productSales[item.product_id]) {
              const prod = products?.find(p => p.id === item.product_id);
              productSales[item.product_id] = {
                product: prod || { id: item.product_id, name: item.name, price: item.price, image_url: item.image, description: '', is_featured: false, category_id: null, stock: 0, created_at: '', colors: [], sizes: [] },
                quantity: 0,
                revenue: 0
              };
            }
            productSales[item.product_id].quantity += item.quantity;
            productSales[item.product_id].revenue += item.quantity * item.price;
          });
        }
      });

      const sortedProducts = Object.values(productSales);
      stats.topSellingProducts = sortedProducts
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Calculate revenue change
      stats.revenueChange = stats.previousPeriodRevenue
        ? ((stats.totalRevenue - stats.previousPeriodRevenue) / stats.previousPeriodRevenue) * 100
        : 0;

      setDashboardStats(stats);

      // Update notifications
      const newNotifications: { type: 'warning' | 'info' | 'error'; message: string; }[] = [];
      if (stats.orderStatus.pending > 0) {
        newNotifications.push({
          type: 'warning',
          message: `${stats.orderStatus.pending} đơn hàng đang chờ xử lý`
        });
      }
      if (stats.lowStockProducts.length > 0) {
        newNotifications.push({
          type: 'warning',
          message: `${stats.lowStockProducts.length} sản phẩm sắp hết hàng`
        });
      }
      if (stats.revenueChange < 0) {
        newNotifications.push({
          type: 'error',
          message: `Doanh thu giảm ${Math.abs(stats.revenueChange).toFixed(1)}% so với kỳ trước`
        });
      }
      setNotifications(newNotifications);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = () => {
    // TODO: Implement PDF export
    console.log('Exporting report...');
    toast.success('Đang xuất báo cáo...');
  };

  const handleSendPromotion = () => {
    // TODO: Implement email sending
    console.log('Sending promotion emails...');
    toast.success('Đang gửi thông báo khuyến mãi...');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <motion.div
        initial={{ width: isSidebarOpen ? 240 : 0 }}
        animate={{ width: isSidebarOpen ? 240 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-white shadow-lg overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold text-primary-600"
          >
            Admin Panel
          </motion.h1>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 rounded-full hover:bg-gray-100"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
        <nav className="mt-4">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              variants={tabVariants}
              animate={activeTab === tab.id ? 'active' : 'inactive'}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
              to={`/admin/${tab.id}`}
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-200"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
            </motion.div>
          ))}
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-sm p-4 flex items-center justify-between"
        >
          <h2 className="text-xl font-semibold text-gray-800">Quản trị</h2>
          <div className="flex items-center gap-4">
            {/* Tìm kiếm riêng cho từng tab */}
            {activeTab === 'products' && (
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchProducts}
                onChange={e => setSearchProducts(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            {activeTab === 'categories' && (
              <input
                type="text"
                placeholder="Tìm kiếm danh mục..."
                value={searchCategories}
                onChange={e => setSearchCategories(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            {activeTab === 'voucher' && (
              <input
                type="text"
                placeholder="Tìm kiếm voucher..."
                value={searchVouchers}
                onChange={e => setSearchVouchers(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            <span className="text-sm text-gray-500">Admin</span>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white cursor-pointer"
            >
              <User size={16} />
            </motion.div>
            </div>
        </motion.header>

        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Routes>
                <Route path="/" element={<Dashboard 
                  stats={dashboardStats}
                  isLoading={isLoading}
                  selectedPeriod={selectedPeriod}
                  setSelectedPeriod={setSelectedPeriod}
                  customDateRange={customDateRange}
                  setCustomDateRange={setCustomDateRange}
                  notifications={notifications}
                  onExportReport={handleExportReport}
                  onSendPromotion={handleSendPromotion}
                />} />
                <Route path="/dashboard" element={<Dashboard 
                  stats={dashboardStats}
                  isLoading={isLoading}
                  selectedPeriod={selectedPeriod}
                  setSelectedPeriod={setSelectedPeriod}
                  customDateRange={customDateRange}
                  setCustomDateRange={setCustomDateRange}
                  notifications={notifications}
                  onExportReport={handleExportReport}
                  onSendPromotion={handleSendPromotion}
                />} />
                <Route path="/products" element={<Products search={searchProducts} setSearch={setSearchProducts} />} />
                <Route path="/categories" element={<Categories search={searchCategories} />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/users" element={<Customers />} />
                <Route path="/voucher" element={<VoucherManager search={searchVouchers} />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// Dashboard Component
interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  customDateRange: { start: Date; end: Date };
  setCustomDateRange: (range: { start: Date; end: Date }) => void;
  notifications: { type: 'warning' | 'info' | 'error'; message: string; }[];
  onExportReport: () => void;
  onSendPromotion: () => void;
}

const Dashboard = ({
  stats,
  isLoading,
  selectedPeriod,
  setSelectedPeriod,
  customDateRange,
  setCustomDateRange,
  notifications,
  
  onSendPromotion
}: DashboardProps) => {
  const COLORS = ['#FFBB28', '#00C49F', '#FF8042'];
  const [lowStockPage, setLowStockPage] = useState(1);
  const lowStockPerPage = 8;
  const paginatedLowStock = stats?.lowStockProducts.slice((lowStockPage - 1) * lowStockPerPage, lowStockPage * lowStockPerPage) || [];
  const totalLowStockPages = stats ? Math.ceil(stats.lowStockProducts.length / lowStockPerPage) : 1;
  const [showNotif, setShowNotif] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  // Xuất báo cáo Excel
  const handleExportExcel = () => {
    if (!stats || stats.totalOrders === 0) {
      setExportMsg('Chưa có dữ liệu để xuất');
      setShowExportPopup(true);
      return;
    }
    // Chuẩn bị dữ liệu
    const wsData = [
      ['Tên sản phẩm', 'Số lượng bán', 'Doanh thu'],
      ...stats.topSellingProducts.map(item => [item.product.name, item.quantity, item.revenue]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Sản Phẩm');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'bao_cao_san_pham.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tổng quan</h2>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Download size={20} />
            Xuất báo cáo
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSendPromotion}
            className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Mail size={20} />
            Gửi khuyến mãi
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotif(v => !v)}
            className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 relative"
          >
            <Bell size={20} />
            {notifications.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{notifications.length}</span>}
          </motion.button>
        </div>
      </div>

      {/* Time period filter */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {timePeriods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <DatePicker
                selected={customDateRange.start}
                onChange={(date: Date | null) => date && setCustomDateRange({ ...customDateRange, start: date })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                dateFormat="dd/MM/yyyy"
                locale={vi}
              />
              <span>đến</span>
              <DatePicker
                selected={customDateRange.end}
                onChange={(date: Date | null) => date && setCustomDateRange({ ...customDateRange, end: date })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                dateFormat="dd/MM/yyyy"
                locale={vi}
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : stats ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
              whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg"
        >
              <h3 className="text-lg font-medium text-primary-800">Tổng doanh thu</h3>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className={`text-sm mt-2 ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange).toFixed(1)}% so với kỳ trước
              </p>
        </motion.div>
        <motion.div
              whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg"
        >
              <h3 className="text-lg font-medium text-green-800">Tổng đơn hàng</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalOrders}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.orderStatus.pending} đơn đang xử lý
              </p>
        </motion.div>
        <motion.div
              whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg"
        >
          <h3 className="text-lg font-medium text-blue-800">Tổng khách hàng</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalCustomers}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.newCustomers} khách hàng mới
              </p>
        </motion.div>
      </div>

          {/* Charts and tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order status chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium mb-4">Trạng thái đơn hàng</h3>
              <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Đang xử lý', value: stats.orderStatus.pending },
                        { name: 'Đã giao', value: stats.orderStatus.completed },
                        { name: 'Bị hủy', value: stats.orderStatus.cancelled }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Đang xử lý', value: stats.orderStatus.pending },
                        { name: 'Đã giao', value: stats.orderStatus.completed },
                        { name: 'Bị hủy', value: stats.orderStatus.cancelled }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
              <Tooltip />
                  </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

            {/* Top selling products */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium mb-4">Sản phẩm bán chạy</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pb-3">Sản phẩm</th>
                      <th className="pb-3">Số lượng</th>
                      <th className="pb-3">Doanh thu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Màu sắc</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kích cỡ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSellingProducts.map((item) => (
                      <tr key={item.product.id} className="border-t">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <span className="font-medium">{item.product.name}</span>
                          </div>
                        </td>
                        <td className="py-3">{item.quantity}</td>
                        <td className="py-3">{formatCurrency(item.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(item.product.colors) ? item.product.colors.join(', ') : ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(item.product.sizes) ? item.product.sizes.join(', ') : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Low stock products */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-medium mb-4">Sản phẩm sắp hết hàng</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-500">
                    <th className="pb-3">Sản phẩm</th>
                    <th className="pb-3">Số lượng còn lại</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLowStock.map((product) => (
                    <tr key={product.id} className="border-t">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`font-medium ${product.stock < 5 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalLowStockPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={lowStockPage}
                  totalPages={totalLowStockPages}
                  onPageChange={setLowStockPage}
                />
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Popup xuất báo cáo */}
      {showExportPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4">
            <AlertTriangle size={40} className="text-red-500" />
            <div className="text-lg font-semibold">{exportMsg}</div>
            <button onClick={() => setShowExportPopup(false)} className="px-4 py-2 bg-primary-500 text-white rounded-lg">Đóng</button>
          </div>
        </div>
      )}

      {/* Danh sách thông báo khi bấm icon */}
      <AnimatePresence>
        {showNotif && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed top-20 right-8 z-50 w-80 bg-white rounded-xl shadow-xl p-4 space-y-3"
          >
            {notifications.map((notification, index) => (
              <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                notification.type === 'error' ? 'bg-red-100 text-red-700' :
                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {notification.type === 'error' ? <AlertTriangle size={24} /> : <Bell size={24} />}
                <span>{notification.message}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Products Component
interface ProductsProps { search: string, setSearch: (val: string) => void }
const Products = ({ search, setSearch }: ProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'product' | 'category'} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    sold: '',
    category_id: '',
    description: '',
    image: null as File | null,
    is_featured: false,
    colors: '',
    sizes: '',
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Số sản phẩm mỗi trang
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch products & categories from Supabase
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Lỗi khi tải danh sách sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    if (!error) setCategories(data || []);
  };

  const handleOpenModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        stock: product.stock.toString(),
        sold: product.sold?.toString() || '',
        category_id: product.category_id || '',
        description: product.description,
        image: null,
        is_featured: product.is_featured,
        colors: Array.isArray(product.colors) ? product.colors.join(',') : '',
        sizes: Array.isArray(product.sizes) ? product.sizes.join(',') : '',
      });
      setImagePreview(product.image_url);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        stock: '',
        sold: '',
        category_id: '',
        description: '',
        image: null,
        is_featured: false,
        colors: '',
        sizes: '',
      });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      stock: '',
      sold: '',
      category_id: '',
      description: '',
      image: null,
      is_featured: false,
      colors: '',
      sizes: '',
    });
    setImagePreview('');
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `products/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      let imageUrl = editingProduct?.image_url || '';
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }
      const productData = {
        name: formData.name,
        price: Number(formData.price),
        stock: Number(formData.stock),
        sold: Number(formData.sold),
        category_id: formData.category_id || null,
        description: formData.description,
        image_url: imageUrl,
        is_featured: formData.is_featured,
        colors: formData.colors.trim() ? formData.colors.split(',').map(s => s.trim()).filter(Boolean) : null,
        sizes: formData.sizes.trim() ? formData.sizes.split(',').map(s => s.trim()).filter(Boolean) : null,
      };
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
        toast.success('Thêm sản phẩm mới thành công!');
      }
      await fetchProducts();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Có lỗi xảy ra khi lưu sản phẩm');
    }
  };

  const handleDelete = (id: string, name: string, type: 'product' | 'category') => {
    setItemToDelete({ id, name, type });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from(itemToDelete.type === 'product' ? 'products' : 'categories')
        .delete()
        .eq('id', itemToDelete.id);
      if (error) throw error;
      if (itemToDelete.type === 'product') {
        await fetchProducts();
        toast.success('Xóa sản phẩm thành công!');
      } else {
        await fetchCategories();
        toast.success('Xóa danh mục thành công!');
      }
    } catch (error) {
      toast.error(`Có lỗi xảy ra khi xóa ${itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}`);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Tính toán sản phẩm cho trang hiện tại
  

  // Tính tổng số trang
  const totalPages = Math.ceil(products.length / itemsPerPage);

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  // Scroll to top khi chuyển trang
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [currentPage]);

  // State cho bulk edit
  
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    price: '',
    stock: '',
    category_id: '',
    colors: '',
    sizes: '',
    is_featured: false,
  });

  // Hàm chọn tất cả
  
  // Hàm chọn từng sản phẩm
  

  // Hàm mở modal bulk edit
  const openBulkEditModal = () => {
    setBulkEditModalOpen(true);
    setBulkEditData({ price: '', stock: '', category_id: '', colors: '', sizes: '', is_featured: false });
  };

  // Hàm xác nhận bulk edit
  const handleBulkEdit = async () => {
    const updateFields: any = {};
    if (bulkEditData.price) updateFields.price = Number(bulkEditData.price);
    if (bulkEditData.stock) updateFields.stock = Number(bulkEditData.stock);
    if (bulkEditData.category_id) updateFields.category_id = bulkEditData.category_id;
    if (bulkEditData.colors) updateFields.colors = bulkEditData.colors.split(',').map(s => s.trim()).filter(Boolean);
    if (bulkEditData.sizes) updateFields.sizes = bulkEditData.sizes.split(',').map(s => s.trim()).filter(Boolean);
    if (bulkEditData.is_featured) updateFields.is_featured = true;
    if (Object.keys(updateFields).length === 0) {
      toast.error('Vui lòng nhập ít nhất một trường để cập nhật!');
      return;
    }
    try {
      const { error } = await supabase
        .from('products')
        .update(updateFields)
        .in('id', selectedProducts);
      if (error) throw error;
      toast.success('Cập nhật hàng loạt thành công!');
      setBulkEditModalOpen(false);
      setSelectedProducts([]);
      await fetchProducts();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi cập nhật hàng loạt');
    }
  };

  // Lọc sản phẩm theo search (từ props)
  const filteredProducts = products.filter(p => {
    const q = removeVietnameseTones((search || '').trim().toLowerCase());
    const name = removeVietnameseTones(p.name);
    return name.includes(q);
  });

  // Trong Products, bổ sung logic xóa hàng loạt
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Hàm chọn tất cả sản phẩm đang hiển thị
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Hàm chọn từng sản phẩm
  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedProducts(prev => checked ? [...prev, id] : prev.filter(pid => pid !== id));
  };

  // Hàm xóa hàng loạt
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts);
      if (error) throw error;
      toast.success('Đã xóa sản phẩm!');
      setSelectedProducts([]);
      await fetchProducts();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi xóa sản phẩm');
    }
  };

  // Thêm biến paginatedProducts
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <div className="admin-products-header flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý sản phẩm</h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          {selectedProducts.length > 0 && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openBulkEditModal}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold transition-all duration-200 border-2 border-yellow-400"
                style={{ boxShadow: '0 2px 8px 0 rgba(255, 193, 7, 0.12)' }}
              >
                Sửa hàng loạt
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold transition-all duration-200 border-2 border-red-400"
                style={{ boxShadow: '0 2px 8px 0 rgba(255, 0, 0, 0.12)' }}
              >
                Xóa hàng loạt
              </motion.button>
            </>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenModal()}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold transition-all duration-200 border-2 border-primary-400"
            style={{ boxShadow: '0 2px 8px 0 rgba(80, 0, 200, 0.12)' }}
          >
            <Package size={20} />
            Thêm sản phẩm mới
          </motion.button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">Đang tải...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Không tìm thấy sản phẩm nào.</div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0} onChange={e => handleSelectAll(e.target.checked)} /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình ảnh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lượt bán</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nổi bật</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Màu sắc</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kích cỡ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-center"><input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={e => handleSelectProduct(product.id, e.target.checked)} /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={product.image_url || '/placeholder.png'}
                        alt={product.name}
                        className="h-16 w-16 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(product.price).toLocaleString('vi-VN')}đ</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sold ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.categories?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.is_featured ? '✔️' : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(product.colors) ? product.colors.join(', ') : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(product.sizes) ? product.sizes.join(', ') : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleOpenModal(product)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Sửa
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(product.id, product.name, 'product')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Xóa
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="p-4 border-t">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                  }}
                />
          </div>
            )}
          </>
        )}
      </div>
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0, rotateY: -60, scale: 0.9 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ perspective: 1000 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -60, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ perspective: 1000 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-4">
                {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                    <div className="mt-1 flex items-center gap-4">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                      )}
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <ImageIcon size={20} />
                          Chọn ảnh
                        </div>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tên sản phẩm</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Giá</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tồn kho</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lượt bán</label>
                    <input
                      type="number"
                      value={formData.sold}
                      onChange={(e) => setFormData({ ...formData, sold: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      id="is_featured"
                    />
                    <label htmlFor="is_featured" className="text-sm text-gray-700">Sản phẩm nổi bật</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Màu sắc (cách nhau bởi dấu phẩy)</label>
                    <input
                      type="text"
                      value={formData.colors}
                      onChange={e => setFormData({ ...formData, colors: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Đỏ,Xanh,Đen..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kích cỡ (cách nhau bởi dấu phẩy)</label>
                    <input
                      type="text"
                      value={formData.sizes}
                      onChange={e => setFormData({ ...formData, sizes: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="S,M,L,XL..."
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08, rotateY: 8 }}
                    whileTap={{ scale: 0.95, rotateY: -8 }}
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                  >
                    {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteModalOpen && itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}
              </h3>
              <p>Bạn có chắc chắn muốn xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'} <b>{itemToDelete.name}</b> không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
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
      <AnimatePresence>
        {bulkEditModalOpen && (
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
              <h3 className="text-xl font-bold mb-4 text-primary-700">Sửa hàng loạt sản phẩm</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giá mới</label>
                  <input type="number" value={bulkEditData.price} onChange={e => setBulkEditData({ ...bulkEditData, price: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tồn kho mới</label>
                  <input type="number" value={bulkEditData.stock} onChange={e => setBulkEditData({ ...bulkEditData, stock: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                  <select value={bulkEditData.category_id} onChange={e => setBulkEditData({ ...bulkEditData, category_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                    <option value="">Không đổi</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Màu sắc (cách nhau bởi dấu phẩy)</label>
                  <input type="text" value={bulkEditData.colors} onChange={e => setBulkEditData({ ...bulkEditData, colors: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kích cỡ (cách nhau bởi dấu phẩy)</label>
                  <input type="text" value={bulkEditData.sizes} onChange={e => setBulkEditData({ ...bulkEditData, sizes: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={bulkEditData.is_featured} onChange={e => setBulkEditData({ ...bulkEditData, is_featured: e.target.checked })} id="bulk_is_featured" />
                  <label htmlFor="bulk_is_featured" className="text-sm text-gray-700">Đánh dấu nổi bật</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setBulkEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleBulkEdit} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">Cập nhật</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa sản phẩm
              </h3>
              <p>Bạn có chắc chắn muốn xóa <b>{selectedProducts.length}</b> sản phẩm đã chọn không? Hành động này <b>không thể hoàn tác</b>.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Categories Component
interface CategoriesProps { search: string }
const Categories = ({ search }: CategoriesProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'product' | 'category'} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Số danh mục mỗi trang (2 dòng x 3 cột)

  // Reset về trang 1 khi thay đổi danh sách danh mục
  useEffect(() => {
    setCurrentPage(1);
  }, [categories]);

  // Scroll to top khi chuyển trang
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [currentPage]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Lỗi khi tải danh sách danh mục');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        image: null,
      });
      setImagePreview(category.image_url || '');
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        image: null,
      });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: null,
    });
    setImagePreview('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `categories/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      let imageUrl = editingCategory?.image_url || '';
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }
      const categoryData = {
        name: formData.name,
        description: formData.description,
        image_url: imageUrl,
      };
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Cập nhật danh mục thành công!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);
        if (error) throw error;
        toast.success('Thêm danh mục mới thành công!');
      }
      await fetchCategories();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Có lỗi xảy ra khi lưu danh mục');
    }
  };

  const handleDelete = (id: string, name: string, type: 'product' | 'category') => {
    setItemToDelete({ id, name, type });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from(itemToDelete.type === 'product' ? 'products' : 'categories')
        .delete()
        .eq('id', itemToDelete.id);
      if (error) throw error;
      if (itemToDelete.type === 'category') {
        await fetchCategories();
        toast.success('Xóa danh mục thành công!');
      }
    } catch (error) {
      toast.error(`Có lỗi xảy ra khi xóa ${itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}`);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Tính toán danh mục cho trang hiện tại
  const paginatedCategories = categories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Tính tổng số trang
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  // Lọc danh mục theo search (từ props)
  const filteredCategories = categories.filter(c => {
    const q = removeVietnameseTones((search || '').trim().toLowerCase());
    const name = removeVietnameseTones(c.name);
    const desc = removeVietnameseTones(c.description || '');
    return name.includes(q) || desc.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="admin-categories-header flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý danh mục</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Thêm danh mục mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
              <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-gray-100">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon size={40} />
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-4">{category.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(category)}
                  className="flex-1 bg-primary-100 text-primary-700 px-3 py-2 rounded hover:bg-primary-200"
                >
                  Chỉnh sửa
                </button>
                <button
                    onClick={() => handleDelete(category.id, category.name, 'category')}
                  className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
          </div>
          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                }}
              />
        </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                  <div className="mt-1 flex items-center gap-4">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded-lg"
                      />
                    )}
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <ImageIcon size={20} />
                        Chọn ảnh
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên danh mục</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AnimatePresence>
        {deleteModalOpen && itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}
              </h3>
              <p>Bạn có chắc chắn muốn xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'} <b>{itemToDelete.name}</b> không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
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
    </div>
  );
};

// Orders Component
const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const itemsPerPage = 10; // Số đơn hàng mỗi trang

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch orders first
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Then fetch users for those orders
      const userIds = [...new Set((orders || []).map(o => o.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Map users to orders
      const ordersWithUsers = orders?.map(order => ({
        ...order,
        user: users?.find(u => u.id === order.user_id)
      }));

      setOrders(ordersWithUsers || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      // 1. Lấy thông tin đơn hàng
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      // 2. Cập nhật số lượng sản phẩm và lượt bán
      for (const item of order.items) {
        // Lấy thông tin sản phẩm hiện tại
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock, sold')
          .eq('id', item.product_id)
          .single();

        if (productError) throw productError;

        // Kiểm tra số lượng tồn kho
        if (product.stock < item.quantity) {
          throw new Error(`Sản phẩm ${item.name} không đủ số lượng trong kho`);
        }

        // Cập nhật số lượng mới
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock: product.stock - item.quantity,
            sold: (product.sold || 0) + item.quantity
          })
          .eq('id', item.product_id);

        if (updateError) throw updateError;
      }

      // 3. Cập nhật trạng thái đơn hàng
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (statusError) throw statusError;

      toast.success('Đã duyệt đơn hàng!');
      fetchOrders();
    } catch (error: any) {
      console.error('Error approving order:', error);
      toast.error(error.message || 'Lỗi khi duyệt đơn hàng');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id + '-cancel');
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id);
    setActionLoading(null);
    if (!error) {
      toast.success('Đã hủy đơn hàng!');
      fetchOrders();
    } else {
      toast.error('Lỗi khi hủy đơn hàng');
    }
  };

  const handleRefund = async (id: string) => {
    setActionLoading(id + '-refund');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          refund: true,
          refund_amount: refundAmount,
          refund_date: new Date().toISOString(),
          refund_reason: refundReason
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Đã hoàn tiền thành công!');
      setShowRefundModal(false);
      setRefundAmount(0);
      setRefundReason('');
      fetchOrders();
    } catch (error) {
      console.error('Error refunding order:', error);
      toast.error('Lỗi khi hoàn tiền đơn hàng');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveRefund = async (id: string) => {
    setActionLoading(id + '-approve-refund');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          refund_status: 'approved',
          refund_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Đã duyệt yêu cầu hoàn tiền!');
      fetchOrders();
    } catch (error) {
      console.error('Error approving refund:', error);
      toast.error('Lỗi khi duyệt yêu cầu hoàn tiền');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRefund = async (id: string) => {
    setActionLoading(id + '-reject-refund');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          refund_status: 'rejected',
          refund_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Đã từ chối yêu cầu hoàn tiền!');
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting refund:', error);
      toast.error('Lỗi khi từ chối yêu cầu hoàn tiền');
    } finally {
      setActionLoading(null);
    }
  };

  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Quản lý đơn hàng</h2>
      <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
        {loading ? (
          <div className="text-center text-gray-500">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500">Không có đơn hàng nào.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="py-2">Mã đơn</th>
                <th className="py-2">Khách hàng</th>
                <th className="py-2">Ngày đặt</th>
                <th className="py-2">Tổng tiền</th>
                <th className="py-2">Trạng thái</th>
                <th className="py-2">Yêu cầu hoàn tiền</th>
                <th className="py-2">Sản phẩm</th>
                <th className="py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map(order => (
                <tr key={order.id} className="border-t text-sm">
                  <td className="py-2 font-mono text-primary-700 cursor-pointer underline hover:text-primary-600" onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}>{order.id}</td>
                  <td className="py-2">{order.user?.full_name || order.user_id}<br /><span className="text-xs text-gray-400">{order.user?.email}</span></td>
                  <td className="py-2">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                  <td className="py-2 font-semibold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                      ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${order.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                      ${order.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                    `}>{translateOrderStatus(order.status)}</span>
                  </td>
                  <td className="py-2">
                    {order.refund_request && (
                      <div className="space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                          ${order.refund_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${order.refund_status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                          ${order.refund_status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                        `}>
                          {order.refund_status === 'pending' ? 'Chờ duyệt' :
                           order.refund_status === 'approved' ? 'Đã duyệt' :
                           'Đã từ chối'}
                        </span>
                        {order.refund_reason && (
                          <div className="text-xs text-gray-500">Lý do: {order.refund_reason}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2">
                    <ul className="list-disc pl-4">
                      {order.items && Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                        <li key={idx}>
                          {item.name} x {item.quantity} ({item.price?.toLocaleString('vi-VN')}đ)
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2">
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(order.id)}
                          disabled={actionLoading === order.id + '-approve'}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-approve' ? 'Đang duyệt...' : 'Duyệt'}</button>
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={actionLoading === order.id + '-cancel'}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-cancel' ? 'Đang hủy...' : 'Hủy'}</button>
                      </div>
                    )}
                    {order.refund_request && order.refund_status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApproveRefund(order.id)}
                          disabled={actionLoading === order.id + '-approve-refund'}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-approve-refund' ? 'Đang duyệt...' : 'Duyệt hoàn tiền'}</button>
                        <button
                          onClick={() => handleRejectRefund(order.id)}
                          disabled={actionLoading === order.id + '-reject-refund'}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-reject-refund' ? 'Đang từ chối...' : 'Từ chối'}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {/* Modal chi tiết đơn hàng */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative animate-fadeIn">
            <button onClick={() => setShowOrderModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-primary-600 text-xl">×</button>
            <h3 className="text-2xl font-bold mb-2 text-primary-700">Chi tiết đơn hàng</h3>
            <div className="mb-4 text-sm text-gray-500">Mã đơn: <span className="font-mono text-primary-700">{selectedOrder.id}</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="mb-2"><b>Khách hàng:</b> {selectedOrder.user?.full_name || selectedOrder.user_id}</div>
                <div className="mb-2"><b>Email:</b> {selectedOrder.user?.email}</div>
                <div className="mb-2"><b>Ngày đặt:</b> {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                <div className="mb-2"><b>Trạng thái:</b> <span className="font-semibold">{translateOrderStatus(selectedOrder.status)}</span></div>
                <div className="mb-2"><b>Tổng tiền:</b> <span className="text-primary-600 font-bold">{selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                {selectedOrder.address && (
                  <div className="mb-2"><b>Địa chỉ giao hàng:</b> {selectedOrder.address}</div>
                )}
                {selectedOrder.note && (
                  <div className="mb-2"><b>Ghi chú:</b> {selectedOrder.note}</div>
                )}
              </div>
              <div>
                <b>Danh sách sản phẩm:</b>
                <ul className="mt-2 space-y-2">
                  {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg border" />}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">x{item.quantity} ({item.price?.toLocaleString('vi-VN')}đ)</div>
                        {item.color && <div className="text-xs">Màu: {item.color}</div>}
                        {item.size && <div className="text-xs">Size: {item.size}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {selectedOrder.status === 'pending' && (
              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={() => { handleApprove(selectedOrder.id); setShowOrderModal(false); }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
                >Duyệt đơn</button>
                <button
                  onClick={() => { handleCancel(selectedOrder.id); setShowOrderModal(false); }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
                >Hủy đơn</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal hoàn tiền */}
      <AnimatePresence>
        {showRefundModal && selectedOrder && (
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
              <h3 className="text-xl font-bold mb-4 text-primary-700">Hoàn tiền đơn hàng</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền hoàn trả</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max={selectedOrder.total_amount}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do hoàn tiền</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Nhập lý do hoàn tiền..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundAmount(0);
                    setRefundReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleRefund(selectedOrder.id)}
                  disabled={actionLoading === selectedOrder.id + '-refund'}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 disabled:opacity-60"
                >
                  {actionLoading === selectedOrder.id + '-refund' ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Customers Component
const Customers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  const roleOptions = [
    { value: 'user', label: 'Người dùng' },
    { value: 'admin', label: 'Quản trị viên' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const handleOpenUser = (user: any) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('users').delete().eq('id', userToDelete.id);
    setDeleteLoading(false);
    if (!error) {
      toast.success('Đã xóa user!');
      setShowUserModal(false);
      setShowDeleteUserModal(false);
      fetchUsers();
    } else {
      toast.error('Lỗi khi xóa user');
    }
  };

  const handleChangeRole = async (id: string, newRole: string) => {
    setRoleLoading(true);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id);
    setRoleLoading(false);
    if (!error) {
      toast.success('Cập nhật quyền thành công!');
      setSelectedUser((prev: any) => ({ ...prev, role: newRole }));
      fetchUsers();
    } else {
      toast.error('Lỗi khi cập nhật quyền');
    }
  };

  // Lọc user theo search
  const filteredUsers = users.filter(u => {
    const q = removeVietnameseTones(search.trim().toLowerCase());
    const name = removeVietnameseTones(u.full_name || '');
    const email = removeVietnameseTones(u.email || '');
    return name.includes(q) || email.includes(q) || (u.id || '').includes(q);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Quản lý khách hàng</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm tên, email, ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center">Đang tải...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Không tìm thấy user nào.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="py-2">Avatar</th>
                <th className="py-2">Tên</th>
                <th className="py-2">Email</th>
                <th className="py-2">Ngày tạo</th>
                <th className="py-2">Quyền</th>
                <th className="py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenUser(user)}>
                  <td className="py-2">
                    <img src={user.avatar_url || '/avatar-default.png'} alt={user.full_name} className="w-10 h-10 rounded-full object-cover border" />
                  </td>
                  <td className="py-2 font-medium">{user.full_name}</td>
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">{user.created_at ? new Date(user.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                      {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs">{user.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal chi tiết user */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative animate-fadeIn">
            <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-primary-600 text-xl">×</button>
            <div className="flex flex-col items-center gap-3 mb-4">
              <img src={selectedUser.avatar_url || '/avatar-default.png'} alt={selectedUser.full_name} className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 shadow" />
              <div className="text-xl font-bold text-primary-700">{selectedUser.full_name}</div>
              <div className="text-gray-500">{selectedUser.email}</div>
              <div className="text-xs text-gray-400">ID: {selectedUser.id}</div>
              <div className="text-sm text-gray-500">Ngày tạo: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('vi-VN') : ''}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium">Quyền:</span>
                <select
                  value={selectedUser.role || 'user'}
                  onChange={e => handleChangeRole(selectedUser.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  disabled={roleLoading}
                >
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {roleLoading && <span className="text-xs text-gray-400 ml-2">Đang lưu...</span>}
              </div>
            </div>
            {/* Thông tin khác nếu có */}
            {selectedUser.phone && <div className="mb-2"><b>Điện thoại:</b> {selectedUser.phone}</div>}
            {selectedUser.address && <div className="mb-2"><b>Địa chỉ:</b> {selectedUser.address}</div>}
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => { setUserToDelete(selectedUser); setShowDeleteUserModal(true); }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa user'}
              </button>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {showDeleteUserModal && userToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa user
              </h3>
              <p>Bạn có chắc chắn muốn xóa user <b>{userToDelete.full_name}</b> không? Hành động này <b>không thể hoàn tác</b>.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Đang xóa...' : 'Xóa'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Settings Component
const Settings = () => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Cài đặt</h2>
    <div className="bg-white rounded-xl shadow-lg p-6">
      <p className="text-gray-600">Chức năng đang được phát triển...</p>
    </div>
  </div>
);

// Định nghĩa type cho voucher
interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  quantity: number;
  used: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  min_order_value?: number;
  applies_to: 'all' | 'specific_categories' | 'specific_products';
  applied_items: string[];
}

// Hàm ép định dạng ngày về YYYY-MM-DD
function toYYYYMMDD(dateStr: string) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return dateStr;
    // MM/DD/YYYY
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return '';
}

interface VoucherManagerProps { search: string }
function VoucherManager({ search }: VoucherManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editVoucher, setEditVoucher] = useState<Voucher | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{
    code: string;
    title: string;
    description: string;
    discount_type: string;
    discount_value: string;
    quantity: string;
    valid_from: string;
    valid_to: string;
    is_active: boolean;
    min_order_value: string;
    applies_to: string;
    applied_items: string[];
  }>({
    code: '',
    title: '',
    description: '',
    discount_type: 'percent',
    discount_value: '',
    quantity: '',
    valid_from: '',
    valid_to: '',
    is_active: true,
    min_order_value: '',
    applies_to: 'all',
    applied_items: [],
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [products, setProducts] = useState<{id: string, name: string}[]>([]);

  // Lấy danh sách danh mục
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name');
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // Lấy danh sách sản phẩm
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('id, name');
      setProducts(data || []);
    };
    fetchProducts();
  }, []);

  // Lấy danh sách voucher từ Supabase
  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      // Tự động chuyển trạng thái sang ngừng nếu hết hạn
      const now = new Date();
      for (const v of data) {
        if (v.valid_to && new Date(v.valid_to) < now && v.is_active) {
          await supabase.from('vouchers').update({ is_active: false }).eq('id', v.id);
        }
      }
      setVouchers(data.map(v => {
        if (v.valid_to && new Date(v.valid_to) < now) {
          return { ...v, is_active: false };
        }
        return v;
      }) || []);
    }
    setLoading(false);
  };

  // Xử lý mở modal thêm/sửa
  const openAddModal = () => {
    setEditVoucher(null);
    setForm({
      code: '',
      title: '',
      description: '',
      discount_type: 'percent',
      discount_value: '',
      quantity: '',
      valid_from: '',
      valid_to: '',
      is_active: true,
      min_order_value: '',
      applies_to: 'all',
      applied_items: [],
    });
    setShowModal(true);
  };
  const openEditModal = (v: Voucher) => {
    setEditVoucher(v);
    setForm({
      code: v.code,
      title: v.title || '',
      description: v.description,
      discount_type: v.discount_type,
      discount_value: v.discount_value.toString(),
      quantity: v.quantity.toString(),
      valid_from: v.valid_from ? v.valid_from.slice(0, 10) : '',
      valid_to: v.valid_to ? v.valid_to.slice(0, 10) : '',
      is_active: v.is_active,
      min_order_value: v.min_order_value?.toString() || '',
      applies_to: v.applies_to || 'all',
      applied_items: v.applied_items || [],
    });
    setShowModal(true);
  };

  // Kiểm tra ngày hợp lệ
  const isValidDate = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  // Thêm/sửa voucher
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.title || !form.discount_value || !form.quantity) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc!');
      return;
    }
    if ((form.valid_from && !isValidDate(form.valid_from)) || (form.valid_to && !isValidDate(form.valid_to))) {
      toast.error('Ngày không hợp lệ. Vui lòng chọn ngày từ lịch!');
      return;
    }
    const voucherData = {
      code: form.code,
      title: form.title,
      description: form.description,
      discount_type: form.discount_type as 'percent' | 'fixed',
      discount_value: Number(form.discount_value),
      quantity: Number(form.quantity),
      valid_from: form.valid_from ? toYYYYMMDD(form.valid_from) : null,
      valid_to: form.valid_to ? toYYYYMMDD(form.valid_to) : null,
      is_active: form.is_active,
      min_order_value: Number(form.min_order_value),
      applies_to: form.applies_to,
      applied_items: form.applies_to === 'specific_categories' || form.applies_to === 'specific_products' ? form.applied_items : [],
    };
    try {
      if (editVoucher) {
        const { error } = await supabase
          .from('vouchers')
          .update(voucherData)
          .eq('id', editVoucher.id);
        if (error) throw error;
        toast.success('Cập nhật voucher thành công!');
      } else {
        const { error } = await supabase
          .from('vouchers')
          .insert([voucherData]);
        if (error) throw error;
        toast.success('Thêm voucher mới thành công!');
      }
      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi lưu voucher');
    }
  };

  // Xóa voucher
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa voucher này?')) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', id);
    if (!error) {
      toast.success('Đã xóa voucher!');
      fetchVouchers();
    } else {
      toast.error('Lỗi khi xóa voucher');
    }
  };

  // Hiển thị thời gian giới hạn
  const renderTimeLimit = (v: Voucher) => {
    if (!v.valid_from && !v.valid_to) return 'Không giới hạn';
    const from = v.valid_from ? format(new Date(v.valid_from), 'dd/MM/yyyy') : '...';
    const to = v.valid_to ? format(new Date(v.valid_to), 'dd/MM/yyyy') : '...';
    return `${from} - ${to}`;
  };

  // Lọc voucher theo search (từ props)
  const filteredVouchers = vouchers.filter(v => {
    const q = removeVietnameseTones((search || '').trim().toLowerCase());
    const code = removeVietnameseTones(v.code);
    const title = removeVietnameseTones(v.title || '');
    const desc = removeVietnameseTones(v.description || '');
    return (
      code.includes(q) ||
      title.includes(q) ||
      desc.includes(q) ||
      (v.discount_value + '').includes(q) ||
      (v.quantity + '').includes(q) ||
      (v.is_active ? 'dang hoat dong' : 'ngung').includes(q)
    );
  });

  // Khi bấm Xóa
  const handleDeleteClick = (v: Voucher) => {
    setVoucherToDelete(v);
    setDeleteModalOpen(true);
  };

  // Khi xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!voucherToDelete) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', voucherToDelete.id);
    if (!error) {
      toast.success('Đã xóa voucher!');
      fetchVouchers();
    } else {
      toast.error('Lỗi khi xóa voucher');
    }
    setDeleteModalOpen(false);
    setVoucherToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Quản lý voucher</h2>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg font-semibold"
          >
            Thêm voucher mới
          </motion.button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá trị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian giới hạn</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn tối thiểu</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-6">Đang tải...</td></tr>
            ) : filteredVouchers.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-6">Không tìm thấy voucher nào.</td></tr>
            ) : filteredVouchers.map(v => (
              <tr key={v.id}>
                <td className="px-4 py-2 font-bold text-primary-700">{v.code}</td>
                <td className="px-4 py-2">{v.description}</td>
                <td className="px-4 py-2">{v.discount_type === 'percent' ? 'Phần trăm' : 'Cố định'}</td>
                <td className="px-4 py-2">{v.discount_type === 'percent' ? `${v.discount_value}%` : `${v.discount_value.toLocaleString('vi-VN')}đ`}</td>
                <td className="px-4 py-2">{v.quantity}</td>
                <td className="px-4 py-2">{v.used}</td>
                <td className="px-4 py-2">{renderTimeLimit(v)}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{v.is_active ? 'Đang hoạt động' : 'Ngừng'}</span>
                </td>
                <td className="px-4 py-2">{v.min_order_value?.toLocaleString('vi-VN')}đ</td>
                <td className="px-4 py-2 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openEditModal(v)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs"
                  >Sửa</motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteClick(v)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs"
                  >Xóa</motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AnimatePresence>
        {showModal && (
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
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg space-y-4"
            >
              <h3 className="text-xl font-bold mb-4">{editVoucher ? 'Sửa voucher' : 'Thêm voucher mới'}</h3>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã voucher</label>
                  <div className="flex gap-2">
                    <input className="w-full border rounded-lg px-3 py-2" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
                    <button
                      type="button"
                      className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-xs font-semibold"
                      onClick={() => {
                        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
                        setForm(f => ({ ...f, code: random }));
                      }}
                    >
                      Tạo mã ngẫu nhiên
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tiêu đề</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mô tả</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Loại giảm</label>
                    <select className="w-full border rounded-lg px-3 py-2" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                      <option value="percent">Phần trăm</option>
                      <option value="fixed">Cố định</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Giá trị</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Số lượng</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Đã dùng</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={editVoucher?.used || 0} disabled />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Ngày hết hạn</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn hàng tối thiểu</label>
                  <input
                    type="number"
                    value={form.min_order_value}
                    onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                    placeholder="Nhập giá trị tối thiểu của đơn hàng"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Loại áp dụng</label>
                    <select className="w-full border rounded-lg px-3 py-2" value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value, applied_items: [] }))}>
                      <option value="all">Tất cả sản phẩm</option>
                      <option value="specific_categories">Danh mục cụ thể</option>
                      <option value="specific_products">Sản phẩm cụ thể</option>
                    </select>
                  </div>
                  {form.applies_to === 'specific_categories' && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Chọn danh mục</label>
                      <select
                        multiple
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.applied_items}
                        onChange={e => setForm(f => ({ ...f, applied_items: Array.from(e.target.selectedOptions, option => option.value) }))}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {form.applies_to === 'specific_products' && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Chọn sản phẩm</label>
                      <select
                        multiple
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.applied_items}
                        onChange={e => setForm(f => ({ ...f, applied_items: Array.from(e.target.selectedOptions, option => option.value) }))}
                      >
                        {products.map(prod => (
                          <option key={prod.id} value={prod.id}>{prod.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >Hủy</motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                  >Lưu</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteModalOpen && voucherToDelete && (
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
                <span>⚠️</span> Xác nhận xóa voucher
              </h3>
              <p>Bạn có chắc chắn muốn xóa voucher <b>{voucherToDelete.title}</b> ({voucherToDelete.code}) không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDeleteModalOpen(false); setVoucherToDelete(null); }}
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
    </div>
  );
}

export default AdminPage; 