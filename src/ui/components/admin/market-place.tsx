// src/app/admin/analytics/components/marketplace-charts.tsx
"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Globe,
  Award,
  Star,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Receipt,
  BarChart3,
} from "lucide-react";

export default function MarketplaceCharts({ data }: { data: any }) {
  // Sample data - replace with actual data from props
  const orderTrendsData = [
    { month: "Jan", orders: 85, revenue: 125000, avgOrder: 1470 },
    { month: "Feb", orders: 92, revenue: 138000, avgOrder: 1500 },
    { month: "Mar", orders: 108, revenue: 162000, avgOrder: 1500 },
    { month: "Apr", orders: 115, revenue: 172500, avgOrder: 1500 },
    { month: "May", orders: 124, revenue: 186000, avgOrder: 1500 },
    { month: "Jun", orders: 138, revenue: 207000, avgOrder: 1500 },
  ];

  const orderStatusData = [
    { status: "Pending", value: 45, color: "#f59e0b" },
    { status: "Processing", value: 68, color: "#3b82f6" },
    { status: "Shipped", value: 52, color: "#8b5cf6" },
    { status: "Delivered", value: 128, color: "#39b54a" },
    { status: "Cancelled", value: 12, color: "#ef4444" },
  ];

  const marketDistributionData = [
    { market: "UAE", orders: 185, revenue: 277500, share: 35 },
    { market: "Saudi Arabia", orders: 142, revenue: 213000, share: 27 },
    { market: "Qatar", orders: 98, revenue: 147000, share: 18 },
    { market: "Kuwait", orders: 72, revenue: 108000, share: 14 },
    { market: "Domestic", orders: 32, revenue: 48000, share: 6 },
  ];

  const topBuyersData = [
    { name: "Al Dahra", orders: 45, revenue: 67500, market: "UAE" },
    { name: "SABIC Agri", orders: 38, revenue: 57000, market: "Saudi" },
    { name: "Qatar Feed", orders: 32, revenue: 48000, market: "Qatar" },
    { name: "Kuwait Livestock", orders: 28, revenue: 42000, market: "Kuwait" },
    { name: "Oman Trading", orders: 24, revenue: 36000, market: "Oman" },
  ];

  const contractPerformanceData = [
    { month: "Jan", signed: 12, fulfilled: 10, value: 180000 },
    { month: "Feb", signed: 15, fulfilled: 13, value: 225000 },
    { month: "Mar", signed: 18, fulfilled: 16, value: 270000 },
    { month: "Apr", signed: 20, fulfilled: 18, value: 300000 },
    { month: "May", signed: 22, fulfilled: 20, value: 330000 },
    { month: "Jun", signed: 25, fulfilled: 23, value: 375000 },
  ];

  const customerSatisfactionData = [
    { rating: "5 Stars", value: 245, color: "#39b54a" },
    { rating: "4 Stars", value: 125, color: "#8cc63f" },
    { rating: "3 Stars", value: 45, color: "#f59e0b" },
    { rating: "2 Stars", value: 18, color: "#ef4444" },
    { rating: "1 Star", value: 8, color: "#6b7280" },
  ];

  const COLORS = ["#39b54a", "#8cc63f", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

  const totalOrders = data?.orders?.total || 642;
  const totalRevenue = data?.revenue || 963000;
  const avgOrderValue = data?.avgOrderValue || 1500;
  const activeBuyers = data?.topBuyers?.length || 85;
  const contractValue = data?.contracts?.total || 1680000;
  const fulfillmentRate = data?.contracts?.fulfilled 
    ? Math.round((data.contracts.fulfilled / data.contracts.total) * 100) 
    : 86;

  return (
    <div className="space-y-6">
      {/* Marketplace KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MarketplaceKPICard
          title="Total Orders"
          value={totalOrders}
          subvalue="last 30 days"
          change="+22.5%"
          trend="up"
          icon={ShoppingCart}
          color="green"
        />
        <MarketplaceKPICard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}K`}
          subvalue="last 30 days"
          change="+18.3%"
          trend="up"
          icon={DollarSign}
          color="blue"
        />
        <MarketplaceKPICard
          title="Avg Order Value"
          value={`$${avgOrderValue}`}
          subvalue="per order"
          change="+3.2%"
          trend="up"
          icon={Receipt}
          color="purple"
        />
        <MarketplaceKPICard
          title="Fulfillment Rate"
          value={`${fulfillmentRate}%`}
          subvalue="contracts"
          change="+5.1%"
          trend="up"
          icon={CheckCircle}
          color="amber"
        />
      </div>

      {/* Order Trends & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={orderTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#39b54a" />
                <Line yAxisId="right" dataKey="revenue" name="Revenue ($)" stroke="#f59e0b" strokeWidth={2} />
                <Line yAxisId="left" dataKey="avgOrder" name="Avg Order ($)" stroke="#3b82f6" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Market Distribution */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Market Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {marketDistributionData.map((market) => (
              <div key={market.market}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{market.market}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${(market.revenue / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#39b54a] h-2 rounded-full"
                    style={{ width: `${market.share}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{market.orders} orders</span>
                  <span className="text-xs text-green-600">{market.share}% share</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-[#39b54a] to-[#8cc63f] mb-4">
                <span className="text-3xl font-bold text-white">94%</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Export Share</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">of total revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Buyers */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Buyers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 text-left text-xs font-medium text-gray-500">Buyer</th>
                <th className="py-2 text-left text-xs font-medium text-gray-500">Market</th>
                <th className="py-2 text-right text-xs font-medium text-gray-500">Orders</th>
                <th className="py-2 text-right text-xs font-medium text-gray-500">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topBuyersData.map((buyer, index) => (
                <tr key={buyer.name} className="border-b dark:border-gray-700 last:border-0">
                  <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">{buyer.name}</td>
                  <td className="py-3 text-sm text-gray-500">{buyer.market}</td>
                  <td className="py-3 text-sm text-right text-gray-900 dark:text-white">{buyer.orders}</td>
                  <td className="py-3 text-sm text-right font-medium text-green-600">${(buyer.revenue / 1000).toFixed(1)}K</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Performance & Satisfaction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contract Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contractPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="signed" name="Contracts Signed" fill="#39b54a" />
                <Bar yAxisId="left" dataKey="fulfilled" name="Contracts Fulfilled" fill="#8cc63f" />
                <Line yAxisId="right" dataKey="value" name="Contract Value ($)" stroke="#3b82f6" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Customer Satisfaction</h3>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">4.7</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">out of 5 stars</p>
              <div className="space-y-2">
                {customerSatisfactionData.map((rating) => (
                  <div key={rating.rating} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">{rating.rating}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-[#39b54a] h-1.5 rounded-full"
                        style={{ width: `${(rating.value / 441) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{rating.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Marketplace KPI Card Component
function MarketplaceKPICard({ title, value, subvalue, change, trend, icon: Icon, color }: any) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subvalue}</p>
        <p className={`mt-1 flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
          {change} vs previous period
        </p>
      </div>
    </div>
  );
}