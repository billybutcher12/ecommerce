import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total orders
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact' });

        // Fetch total revenue
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount');

        const revenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

        // Fetch total customers
        const { count: customersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' });

        setStats({
          totalOrders: ordersCount || 0,
          totalRevenue: revenue,
          totalCustomers: customersCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Tổng quan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-primary-800">Tổng đơn hàng</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">{stats.totalOrders}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-green-800">Tổng doanh thu</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue)}
          </p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800">Tổng khách hàng</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalCustomers}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 