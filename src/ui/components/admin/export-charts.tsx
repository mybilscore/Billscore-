// src/app/admin/analytics/components/export-charts.tsx
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
  Globe,
  TrendingUp,
  TrendingDown,
  Ship,
  Package,
  Truck,
  Clock,
  MapPin,
  Flag,
  ArrowUpRight,
  ArrowDownRight,
  Container,
  Anchor,
  Navigation,
} from "lucide-react";

export default function ExportCharts({ data }: { data: any }) {
  // Sample data - replace with actual data from props
  const exportVolumeData = [
    { month: "Jan", volume: 450, shipments: 12 },
    { month: "Feb", volume: 520, shipments: 14 },
    { month: "Mar", volume: 610, shipments: 16 },
    { month: "Apr", volume: 580, shipments: 15 },
    { month: "May", volume: 670, shipments: 18 },
    { month: "Jun", volume: 720, shipments: 20 },
  ];

  const destinationData = [
    { country: "UAE", volume: 850, percentage: 35 },
    { country: "Saudi Arabia", volume: 620, percentage: 25 },
    { country: "Qatar", volume: 380, percentage: 15 },
    { country: "Kuwait", volume: 310, percentage: 12 },
    { country: "Oman", volume: 220, percentage: 9 },
    { country: "Others", volume: 120, percentage: 4 },
  ];

  const shippingTimeData = [
    { destination: "UAE", days: 14 },
    { destination: "Saudi Arabia", days: 18 },
    { destination: "Qatar", days: 16 },
    { destination: "Kuwait", days: 20 },
    { destination: "Oman", days: 22 },
  ];

  const monthlyShipmentsData = [
    { month: "Jan", planned: 10, actual: 12, delayed: 2 },
    { month: "Feb", planned: 12, actual: 14, delayed: 1 },
    { month: "Mar", planned: 15, actual: 16, delayed: 3 },
    { month: "Apr", planned: 14, actual: 15, delayed: 2 },
    { month: "May", planned: 16, actual: 18, delayed: 2 },
    { month: "Jun", planned: 18, actual: 20, delayed: 1 },
  ];

  const containerUtilizationData = [
    { type: "20ft", utilization: 85 },
    { type: "40ft", utilization: 92 },
    { type: "40ft HC", utilization: 78 },
    { type: "Reefer", utilization: 65 },
  ];

  const COLORS = ["#39b54a", "#8cc63f", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

  const totalShipments = data?.shipments?.total || 95;
  const exportVolume = (data?.volume || 3250000) / 1000;
  const avgShippingTime = data?.avgShippingTime || 18;
  const pendingShipments = data?.pending || 12;

  return (
    <div className="space-y-6">
      {/* Export KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExportKPICard
          title="Total Shipments"
          value={totalShipments}
          change="+15.3%"
          trend="up"
          icon={Ship}
          color="blue"
        />
        <ExportKPICard
          title="Export Volume"
          value={`${exportVolume.toFixed(0)} t`}
          change="+12.8%"
          trend="up"
          icon={Package}
          color="green"
        />
        <ExportKPICard
          title="Avg Shipping Time"
          value={`${avgShippingTime} days`}
          change="-2.5%"
          trend="down"
          icon={Clock}
          color="purple"
        />
        <ExportKPICard
          title="Pending Shipments"
          value={pendingShipments}
          change="+8.2%"
          trend="up"
          icon={Truck}
          color="orange"
        />
      </div>

      {/* Export Volume Trends */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Export Volume Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={exportVolumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="volume" name="Volume (tons)" fill="#39b54a" />
              <Line yAxisId="right" dataKey="shipments" name="Shipment Count" stroke="#3b82f6" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Destination Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Export by Destination</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={destinationData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="volume"
                  label={({ country, percentage }) => `${country} ${percentage}%`}
                >
                  {destinationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Shipping Times by Destination</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shippingTimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="destination" type="category" />
                <Tooltip />
                <Bar dataKey="days" name="Days" fill="#39b54a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shipment Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Shipment Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyShipmentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" name="Planned" fill="#94a3b8" />
                <Bar dataKey="actual" name="Actual" fill="#39b54a" />
                <Bar dataKey="delayed" name="Delayed" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Container Utilization</h3>
          <div className="space-y-4">
            {containerUtilizationData.map((item) => (
              <div key={item.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.type} Container</span>
                  <span className="font-medium text-gray-900 dark:text-white">{item.utilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#39b54a] h-2 rounded-full"
                    style={{ width: `${item.utilization}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Export Readiness</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600 dark:text-blue-400">Certified Lots</span>
              <span className="text-lg font-bold text-blue-800 dark:text-blue-300">24</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-blue-600 dark:text-blue-400">Ready for Shipment</span>
              <span className="text-lg font-bold text-blue-800 dark:text-blue-300">18</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Destinations */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Export Destinations</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {destinationData.slice(0, 5).map((dest, index) => (
            <div key={dest.country} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Flag className="h-6 w-6 mx-auto mb-2 text-[#39b54a]" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{dest.country}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{dest.volume} t</p>
              <p className="text-xs font-bold text-[#39b54a]">{dest.percentage}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Export KPI Card Component
function ExportKPICard({ title, value, change, trend, icon: Icon, color }: any) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
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
        <p className={`mt-1 flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
          {change} vs previous period
        </p>
      </div>
    </div>
  );
}