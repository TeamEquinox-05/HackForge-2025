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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{dashboardStats?.totalProducts || 0}</div>
                <div className="text-gray-500 text-sm mb-1">Items</div>
                <div className="text-gray-700 text-sm font-medium">TOTAL PRODUCTS</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">{dashboardStats?.lowStockItems || 0}</div>
                <div className="text-gray-500 text-sm mb-1">Items</div>
                <div className="text-gray-700 text-sm font-medium">LOW STOCK ITEMS</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{dashboardStats?.totalSales || 0}</div>
                <div className="text-gray-500 text-sm mb-1">Orders</div>
                <div className="text-gray-700 text-sm font-medium">TOTAL SALES</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">{dashboardStats?.totalVendors || 0}</div>
                <div className="text-gray-500 text-sm mb-1">Partners</div>
                <div className="text-gray-700 text-sm font-medium">TOTAL VENDORS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Product Details Section */}
          <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Product Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-red-600">Low Stock Items</span>
                  <span className="text-red-600 font-bold">{dashboardStats?.lowStockItems || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Purchases</span>
                  <span className="text-gray-900 font-bold">{dashboardStats?.totalPurchases || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">All Items</span>
                  <span className="text-gray-900 font-bold">{dashboardStats?.totalProducts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Recent Sales</span>
                  <span className="text-green-600 font-bold">{dashboardStats?.recentSales?.length || 0}</span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-900 font-bold text-lg">{(dashboardStats?.totalProducts || 0) - (dashboardStats?.lowStockItems || 0)}</div>
                    <div className="text-gray-600 text-sm">In Stock Items</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Inventory Summary</h3>
            <div className="space-y-4">
              <div>
                <div className="text-gray-500 text-sm mb-1">QUANTITY IN HAND</div>
                <div className="text-gray-900 font-bold text-xl">{dashboardStats?.quantityInHand?.toLocaleString() || 0}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">QUANTITY TO BE RECEIVED</div>
                <div className="text-gray-900 font-bold text-xl">{dashboardStats?.quantityToBeReceived || 0}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">TOTAL VENDORS</div>
                <div className="text-gray-900 font-bold text-xl">{dashboardStats?.totalVendors || 0}</div>
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
              {/* Fast Moving Goods */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Fast Moving Goods</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Last 30 days</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {dashboardStats.productMovementAnalytics.fastMovingGoods.length > 0 ? (
                    dashboardStats.productMovementAnalytics.fastMovingGoods.map((product, index) => (
                      <div key={product.productName} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full text-green-700 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{product.productName}</h4>
                              <p className="text-sm text-gray-600">
                                {product.totalQuantitySold} units sold • ₹{product.totalRevenue.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {product.movementRate.toFixed(1)} <span className="text-sm font-normal">units/day</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Stock: {product.currentStock} units
                          </div>
                          {product.daysToStockOut && product.daysToStockOut <= 30 && (
                            <div className="text-xs text-orange-600 font-medium">
                              ⚠️ {product.daysToStockOut} days left
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📈</div>
                      <p>No fast moving products in the last 30 days</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Slow Moving Goods */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Slow Moving Goods</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Needs attention</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {dashboardStats.productMovementAnalytics.slowMovingGoods.length > 0 ? (
                    dashboardStats.productMovementAnalytics.slowMovingGoods.map((product, index) => (
                      <div key={product.productName} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full text-red-700 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{product.productName}</h4>
                              <p className="text-sm text-gray-600">
                                {product.totalQuantitySold > 0 
                                  ? `${product.totalQuantitySold} units sold • ₹${product.totalRevenue.toLocaleString()}`
                                  : 'No sales in last 30 days'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">
                            {product.movementRate.toFixed(1)} <span className="text-sm font-normal">units/day</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Stock: {product.currentStock} units
                          </div>
                          {product.lastSaleDate ? (
                            <div className="text-xs text-gray-400">
                              Last sold: {new Date(product.lastSaleDate).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="text-xs text-red-500">
                              No recent sales
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📉</div>
                      <p>No slow moving products identified</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Analytics Summary */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Analysis Period: {dashboardStats.productMovementAnalytics.period}</span>
                <span>
                  Products Analyzed: {dashboardStats.productMovementAnalytics.summary.totalProductsAnalyzed} 
                  ({dashboardStats.productMovementAnalytics.summary.totalProductsWithSales} with sales, 
                  {dashboardStats.productMovementAnalytics.summary.totalProductsWithoutSales} without sales)
                </span>
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