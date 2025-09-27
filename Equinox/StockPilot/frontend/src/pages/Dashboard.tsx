import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ForecastChart from '../components/ForecastChart';

interface ForecastData {
  date: string;
  predicted_sales: number;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  lowStockThreshold: number;
}

interface Sale {
  _id: string;
  billNumber?: string;
  bill_no?: string;
  totalAmount?: number;
  total?: number;
  items?: any[];
  date: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  payment_method?: string;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  totalAmount: number;
  paymentStatus: string;
  date: string;
}

interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  date: string;
}

interface Vendor {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface RecentPurchaseActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  timeAgo: string;
  amount: number;
  vendor: string;
  payment_status: string;
}

interface RecentSalesActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  timeAgo: string;
  amount: number;
  customer: string;
  payment_method: string;
  bill_no: string;
  date: string;
}

interface ProductMovement {
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  salesCount: number;
  avgSellingPrice: number;
  currentStock: number;
  movementRate: number;
  daysToStockOut: number | null;
  lastSaleDate: string | null;
}

interface ProductMovementAnalytics {
  period: string;
  dateRange: {
    from: string;
    to: string;
  };
  fastMovingGoods: ProductMovement[];
  slowMovingGoods: ProductMovement[];
  summary: {
    totalProductsAnalyzed: number;
    totalProductsWithSales: number;
    totalProductsWithoutSales: number;
  };
}

interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  totalSales: number;
  totalPurchases: number;
  totalVendors: number;
  quantityInHand: number;
  quantityToBeReceived: number;
  recentSales: Sale[];
  recentPurchases: Purchase[];
  purchaseOrderStats: any;
  recentPurchaseActivity: RecentPurchaseActivity[];
  recentSalesActivity: RecentSalesActivity[];
  productMovementAnalytics: ProductMovementAnalytics | null;
}

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setIsAuthenticated(true);
    fetchAllData();
  }, [navigate]);

  const fetchForecastData = async () => {
    try {
      setForecastLoading(true);
      setForecastError(null);
      
      const response = await fetch('http://localhost:5000/api/forecast');
      const result = await response.json();
      
      if (result.success) {
        setForecastData(result.data);
      } else {
        setForecastError(result.message || 'Failed to fetch forecast data');
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
      setForecastError('Failed to connect to forecast service');
    } finally {
      setForecastLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Fetch all data in parallel
      const [
        productsResponse,
        salesResponse,
        purchasesResponse,
        purchaseOrdersResponse,
        vendorsResponse,
        purchaseStatsResponse,
        purchaseOrderStatsResponse,
        recentPurchaseActivityResponse,
        recentSalesActivityResponse,
        productMovementResponse,
        inventoryStatsResponse
      ] = await Promise.all([
        fetch('http://localhost:5000/api/products', { headers }),
        fetch('http://localhost:5000/api/sales', { headers }),
        fetch('http://localhost:5000/api/purchases', { headers }),
        fetch('http://localhost:5000/api/purchase-orders', { headers }),
        fetch('http://localhost:5000/api/vendors', { headers }),
        fetch('http://localhost:5000/api/purchases/stats', { headers }),
        fetch('http://localhost:5000/api/purchase-orders/stats', { headers }),
        fetch('http://localhost:5000/api/purchases/recent-activity?limit=5', { headers }),
        fetch('http://localhost:5000/api/sales/recent-activity?limit=5', { headers }),
        fetch('http://localhost:5000/api/sales/movement-analytics?days=30&limit=5', { headers }),
        fetch('http://localhost:5000/api/products/inventory-stats', { headers })
      ]);

      // Parse all responses
      const [
        productsData,
        salesData,
        purchasesData,
        purchaseOrdersData,
        vendorsData,
        purchaseStatsData,
        purchaseOrderStatsData,
        recentPurchaseActivityData,
        recentSalesActivityData,
        productMovementData,
        inventoryStatsData
      ] = await Promise.all([
        productsResponse.json(),
        salesResponse.json(),
        purchasesResponse.json(),
        purchaseOrdersResponse.json(),
        vendorsResponse.json(),
        purchaseStatsResponse.json(),
        purchaseOrderStatsResponse.json(),
        recentPurchaseActivityResponse.json(),
        recentSalesActivityResponse.json(),
        productMovementResponse.json(),
        inventoryStatsResponse.json()
      ]);

      // Calculate dashboard statistics
      const products = productsData || [];
      const sales = salesData || [];
      const purchases = purchasesData || [];
      const vendors = vendorsData || [];

      // Calculate low stock items
      const lowStockItems = products.filter((product: Product) => 
        product.stockQuantity <= (product.lowStockThreshold || 10)
      ).length;

      // Use inventory stats from API
      const inventoryStats = inventoryStatsData?.success ? inventoryStatsData.data : {
        quantityInHand: 0,
        quantityToBeReceived: 0,
        totalVendors: 0,
        totalInventoryValue: 0,
        lowStockItems: 0
      };

      // Get recent sales (last 5)
      const recentSales = sales.slice(-5).reverse();

      // Get recent purchases (last 5) 
      const recentPurchases = purchases.slice(-5).reverse();

      const stats: DashboardStats = {
        totalProducts: products.length,
        lowStockItems,
        totalSales: sales.length,
        totalPurchases: purchases.length,
        totalVendors: inventoryStats.totalVendors,
        quantityInHand: inventoryStats.quantityInHand,
        quantityToBeReceived: inventoryStats.quantityToBeReceived,
        recentSales,
        recentPurchases,
        purchaseOrderStats: purchaseOrderStatsData,
        recentPurchaseActivity: recentPurchaseActivityData?.activities || [],
        recentSalesActivity: recentSalesActivityData?.activities || [],
        productMovementAnalytics: productMovementData?.success ? productMovementData.data : null
      };

      setDashboardStats(stats);
      
      // Also fetch forecast data
      await fetchForecastData();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error: {error}</div>
          <button 
            onClick={fetchAllData}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p className="text-gray-600">Welcome back to your inventory management system</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-gray-500 text-sm">Today</p>
                  <p className="text-gray-900 font-semibold">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Products Card */}
            <div className="bg-white rounded-xl p-6 border-l-4 border-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-black mb-1">{dashboardStats?.totalProducts || 0}</div>
                  <div className="text-gray-700 font-semibold text-sm uppercase tracking-wide">Total Products</div>
                  <div className="text-gray-500 text-xs mt-1">All inventory items</div>
                </div>
                <div className="bg-gray-900 p-3 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Low Stock Items Card */}
            <div className="bg-white rounded-xl p-6 border-l-4 border-red-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-black mb-1">{dashboardStats?.lowStockItems || 0}</div>
                  <div className="text-gray-700 font-semibold text-sm uppercase tracking-wide">Low Stock Items</div>
                  <div className="text-red-500 text-xs mt-1">Requires attention</div>
                </div>
                <div className="bg-red-500 p-3 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Sales Card */}
            <div className="bg-white rounded-xl p-6 border-l-4 border-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-black mb-1">{dashboardStats?.totalSales || 0}</div>
                  <div className="text-gray-700 font-semibold text-sm uppercase tracking-wide">Total Sales</div>
                  <div className="text-gray-500 text-xs mt-1">Completed orders</div>
                </div>
                <div className="bg-gray-900 p-3 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Vendors Card */}
            <div className="bg-white rounded-xl p-6 border-l-4 border-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-black mb-1">{dashboardStats?.totalVendors || 0}</div>
                  <div className="text-gray-700 font-semibold text-sm uppercase tracking-wide">Total Vendors</div>
                  <div className="text-gray-500 text-xs mt-1">Business partners</div>
                </div>
                <div className="bg-gray-900 p-3 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Product Analytics Section */}
          <div className="lg:col-span-2 bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-black">Product Analytics</h3>
              <div className="bg-gray-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Metrics List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-red-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-500 p-2 rounded-full">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <span className="text-gray-800 font-semibold">Low Stock Items</span>
                  </div>
                  <span className="text-black font-bold text-xl">{dashboardStats?.lowStockItems || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-900 p-2 rounded-full">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <span className="text-gray-800 font-semibold">Total Purchases</span>
                  </div>
                  <span className="text-black font-bold text-xl">{dashboardStats?.totalPurchases || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-600 p-2 rounded-full">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <span className="text-gray-800 font-semibold">All Items</span>
                  </div>
                  <span className="text-black font-bold text-xl">{dashboardStats?.totalProducts || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-700 p-2 rounded-full">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-gray-800 font-semibold">Recent Sales</span>
                  </div>
                  <span className="text-black font-bold text-xl">{dashboardStats?.recentSales?.length || 0}</span>
                </div>
              </div>

              {/* Stock Status Visualization */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-8 border-gray-400 flex items-center justify-center shadow-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-black mb-1">
                        {(dashboardStats?.totalProducts || 0) - (dashboardStats?.lowStockItems || 0)}
                      </div>
                      <div className="text-gray-700 text-sm font-semibold">In Stock Items</div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    {dashboardStats?.totalProducts ? Math.round(((dashboardStats.totalProducts - (dashboardStats.lowStockItems || 0)) / dashboardStats.totalProducts) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-black">Inventory Summary</h3>
              <div className="bg-gray-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Quantity in Hand</div>
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-black font-bold text-2xl">{dashboardStats?.quantityInHand?.toLocaleString() || 0}</div>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-700 text-sm font-semibold uppercase tracking-wide">To be Received</div>
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-black font-bold text-2xl">{dashboardStats?.quantityToBeReceived || 0}</div>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Active Vendors</div>
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-black font-bold text-2xl">{dashboardStats?.totalVendors || 0}</div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-300">
                <div className="text-black text-sm font-semibold mb-3">Quick Actions</div>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                    View Low Stock Items
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                    Create Purchase Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Forecast Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales Forecast</h3>
            {forecastLoading ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-gray-500">Loading forecast data...</div>
              </div>
            ) : forecastError ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-red-500">Error: {forecastError}</div>
                <button 
                  onClick={fetchForecastData}
                  className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            ) : forecastData ? (
              <ForecastChart data={forecastData} title="5-Day Sales Forecast" />
            ) : (
              <div className="flex items-center justify-center h-80">
                <div className="text-gray-500">No forecast data available</div>
              </div>
            )}
          </div>
        </div>

        {/* Product Movement Analytics */}
        {dashboardStats?.productMovementAnalytics && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Selling Products */}
              <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-green-700">Top Selling Products</h3>
                    <div className="bg-green-500 px-2 py-0.5 rounded-full">
                      <span className="text-white text-xs font-medium">Trending</span>
                    </div>
                  </div>
                  <div className="bg-green-100 p-1.5 rounded-md">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {dashboardStats.productMovementAnalytics.fastMovingGoods && dashboardStats.productMovementAnalytics.fastMovingGoods.length > 0 ? (
                    dashboardStats.productMovementAnalytics.fastMovingGoods.map((product, index) => (
                      <div key={`fast-${product.productName}-${index}`} className="bg-green-50 rounded-md p-2 border-l-3 border-green-500 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="flex items-center justify-center w-6 h-6 bg-green-500 rounded-full text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-black text-sm mb-0 truncate">{product.productName}</h4>
                              <div className="flex items-center space-x-1 mt-0">
                                <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span className="text-gray-600 text-xs truncate">
                                  {product.totalQuantitySold || 0} units sold • ₹{product.totalRevenue?.toLocaleString() || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right ml-3 flex-shrink-0">
                            <div className="bg-white rounded-md p-1.5 border border-gray-200 min-w-[100px]">
                              <div className="text-center mb-1">
                                <div className="text-base font-bold text-black">
                                  {product.movementRate?.toFixed(1) || '0.0'}
                                </div>
                                <div className="text-xs text-gray-500">units/day</div>
                              </div>
                              
                              <div className="space-y-0.5 text-xs border-t border-gray-100 pt-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Stock:</span>
                                  <span className="font-medium text-black">{product.currentStock || 0}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Last:</span>
                                  <span className="font-medium text-black text-xs">
                                    {product.lastSaleDate 
                                      ? new Date(product.lastSaleDate).toLocaleDateString('en-GB')
                                      : 'Recently'
                                    }
                                  </span>
                                </div>
                                
                                {product.daysToStockOut && product.daysToStockOut <= 30 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Stock out:</span>
                                    <span className="font-medium text-red-500 text-xs">{product.daysToStockOut}d</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-6xl mb-4 text-gray-400">📈</div>
                      <h4 className="text-xl font-semibold text-black mb-2">No Fast Moving Products</h4>
                      <p className="text-gray-600">No products with significant sales velocity in the last 30 days.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Slow Moving Goods */}
              <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-red-700">Slow Moving Goods</h3>
                    <div className="bg-red-500 px-2 py-0.5 rounded-full">
                      <span className="text-white text-xs font-medium">Needs Attention</span>
                    </div>
                  </div>
                  <div className="bg-red-100 p-1.5 rounded-md">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {dashboardStats.productMovementAnalytics.slowMovingGoods.length > 0 ? (
                    dashboardStats.productMovementAnalytics.slowMovingGoods
                      .sort((a, b) => (a.movementRate || 0) - (b.movementRate || 0))
                      .map((product, index) => (
                      <div key={product.productName} className={`${(product.movementRate || 0) === 0 ? 'bg-red-50 border-l-4 border-red-600' : 'bg-gray-50 border-l-3 border-red-500'} rounded-md p-2 hover:shadow-sm transition-shadow`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className={`flex items-center justify-center w-6 h-6 ${(product.movementRate || 0) === 0 ? 'bg-red-600' : 'bg-gray-900'} rounded-full text-white text-xs font-bold`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-black text-sm mb-0 truncate">{product.productName}</h4>
                              <div className="flex items-center space-x-1 mt-0">
                                <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span className="text-gray-600 text-xs truncate">
                                  {product.totalQuantitySold > 0 
                                    ? `${product.totalQuantitySold} units sold • ₹${product.totalRevenue?.toLocaleString() || 0}`
                                    : 'No sales in last 30 days'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right ml-3 flex-shrink-0">
                            <div className={`bg-white rounded-md p-1.5 border ${(product.movementRate || 0) === 0 ? 'border-red-300' : 'border-gray-200'} min-w-[100px]`}>
                              <div className="text-center mb-1">
                                <div className={`text-base font-bold ${(product.movementRate || 0) === 0 ? 'text-red-600' : 'text-black'}`}>
                                  {product.movementRate?.toFixed(1) || '0.0'}
                                </div>
                                <div className="text-xs text-gray-500">units/day</div>
                              </div>
                              
                              <div className="space-y-0.5 text-xs border-t border-gray-100 pt-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Stock:</span>
                                  <span className="font-medium text-black">{product.currentStock || 0}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Last:</span>
                                  <span className={`font-medium text-xs ${product.lastSaleDate ? 'text-black' : 'text-red-500'}`}>
                                    {product.lastSaleDate 
                                      ? new Date(product.lastSaleDate).toLocaleDateString('en-GB')
                                      : 'No sales'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-6xl mb-4 text-gray-400">📉</div>
                      <h4 className="text-xl font-semibold text-black mb-2">No Slow Moving Products</h4>
                      <p className="text-gray-600">All products are performing well based on current sales data.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Purchased Products */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Purchased Products</h3>
            <div className="space-y-4">
              {(dashboardStats?.recentPurchaseActivity?.length || 0) > 0 ? (
                dashboardStats?.recentPurchaseActivity?.map((activity: RecentPurchaseActivity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        activity.iconColor === 'green' ? 'bg-green-100' :
                        activity.iconColor === 'orange' ? 'bg-orange-100' :
                        activity.iconColor === 'blue' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {activity.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {activity.timeAgo}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                          activity.payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {activity.payment_status}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ₹{activity.amount?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-sm">No recent purchases</div>
                </div>
              )}
              {(dashboardStats?.recentPurchaseActivity?.length || 0) > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => navigate('/purchases')}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All Purchases →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Sales</h3>
            <div className="space-y-4">
              {(dashboardStats?.recentSalesActivity?.length || 0) > 0 ? (
                dashboardStats?.recentSalesActivity?.map((activity: RecentSalesActivity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        activity.iconColor === 'green' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {activity.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {activity.timeAgo}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          ₹{activity.amount?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">💰</div>
                  <div className="text-sm">No recent sales</div>
                </div>
              )}
              {(dashboardStats?.recentSalesActivity?.length || 0) > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => navigate('/sales')}
                    className="w-full text-center text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    View All Sales →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;