// src/app/admin/analytics/components/production-charts.tsx
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
  Sprout,
  TrendingUp,
  TrendingDown,
  Droplets,
  Tractor,
  Leaf,
  Calendar,
  MapPin,
  Sun,
  Wind,
  ArrowUpRight,
  ArrowDownRight,
  Wheat,
  Flower2,
  Timer,
} from "lucide-react";

export default function ProductionCharts({ data }: { data: any }) {
  // Sample data - replace with actual data from props
  const harvestTrendsData = [
    { month: "Jan", volume: 450, harvests: 24, yield: 3.2 },
    { month: "Feb", volume: 520, harvests: 28, yield: 3.4 },
    { month: "Mar", volume: 610, harvests: 32, yield: 3.5 },
    { month: "Apr", volume: 580, harvests: 30, yield: 3.3 },
    { month: "May", volume: 670, harvests: 36, yield: 3.7 },
    { month: "Jun", volume: 720, harvests: 38, yield: 3.8 },
  ];

  const cropCycleData = [
    { name: "Planted", value: 45, color: "#3b82f6" },
    { name: "Germinated", value: 38, color: "#8b5cf6" },
    { name: "Growing", value: 52, color: "#39b54a" },
    { name: "Flowering", value: 28, color: "#f59e0b" },
    { name: "Maturing", value: 22, color: "#ec4899" },
    { name: "Ready", value: 18, color: "#ef4444" },
    { name: "Harvested", value: 35, color: "#6b7280" },
  ];

  const topClustersData = [
    { name: "Cluster A", volume: 1250, farms: 45, yield: 4.2 },
    { name: "Cluster B", volume: 1080, farms: 38, yield: 3.9 },
    { name: "Cluster C", volume: 950, farms: 32, yield: 3.7 },
    { name: "Cluster D", volume: 820, farms: 28, yield: 3.5 },
    { name: "Cluster E", volume: 680, farms: 24, yield: 3.2 },
  ];

  const irrigationData = [
    { month: "Jan", efficiency: 82, waterUsage: 450 },
    { month: "Feb", efficiency: 85, waterUsage: 480 },
    { month: "Mar", efficiency: 88, waterUsage: 520 },
    { month: "Apr", efficiency: 86, waterUsage: 540 },
    { month: "May", efficiency: 84, waterUsage: 580 },
    { month: "Jun", efficiency: 87, waterUsage: 610 },
  ];

  const equipmentData = [
    { type: "Tractors", inUse: 45, available: 12, maintenance: 8 },
    { type: "Harvesters", inUse: 28, available: 6, maintenance: 4 },
    { type: "Irrigation", inUse: 62, available: 18, maintenance: 7 },
    { type: "Sprayers", inUse: 35, available: 10, maintenance: 5 },
    { type: "Vehicles", inUse: 42, available: 14, maintenance: 6 },
  ];

  const soilHealthData = [
    { field: "Field A", ph: 6.8, moisture: 65, organic: 4.2 },
    { field: "Field B", ph: 7.1, moisture: 58, organic: 3.8 },
    { field: "Field C", ph: 6.5, moisture: 72, organic: 4.5 },
    { field: "Field D", ph: 6.9, moisture: 61, organic: 4.0 },
    { field: "Field E", ph: 7.2, moisture: 55, organic: 3.5 },
  ];

  const COLORS = ["#39b54a", "#8cc63f", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

  const totalFarms = data?.farms?.total || 156;
  const activeFarms = data?.farms?.active || 142;
  const totalFields = data?.fields?.total || 389;
  const activeFields = data?.fields?.active || 345;
  const totalHarvests = data?.harvests?.total || 188;
  const harvestVolume = data?.harvests?.volume || 3250;
  const avgYield = (harvestVolume / activeFarms / 2).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Production KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProductionKPICard
          title="Total Farms"
          value={totalFarms}
          subvalue={`${activeFarms} active`}
          change="+12.5%"
          trend="up"
          icon={Sprout}
          color="green"
        />
        <ProductionKPICard
          title="Total Fields"
          value={totalFields}
          subvalue={`${activeFields} active`}
          change="+8.3%"
          trend="up"
          icon={Leaf}
          color="blue"
        />
        <ProductionKPICard
          title="Harvest Volume"
          value={`${harvestVolume} t`}
          subvalue={`${totalHarvests} harvests`}
          change="+15.2%"
          trend="up"
          icon={Wheat}
          color="amber"
        />
        <ProductionKPICard
          title="Avg Yield"
          value={`${avgYield} t/ha`}
          subvalue="per farm"
          change="+5.7%"
          trend="up"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Harvest Trends */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Harvest Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={harvestTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="volume" name="Volume (tons)" fill="#39b54a" />
              <Line yAxisId="right" dataKey="harvests" name="Number of Harvests" stroke="#f59e0b" strokeWidth={2} />
              <Line yAxisId="left" dataKey="yield" name="Yield (t/ha)" stroke="#3b82f6" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Crop Cycles & Top Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Crop Cycles by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cropCycleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {cropCycleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Producing Clusters</h3>
          <div className="space-y-4">
            {topClustersData.map((cluster, index) => (
              <div key={cluster.name}>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{cluster.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{cluster.farms} farms</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{cluster.volume} t</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#39b54a] h-2 rounded-full"
                    style={{ width: `${(cluster.volume / topClustersData[0].volume) * 100}%` }}
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-green-600">{cluster.yield} t/ha avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Irrigation & Equipment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Irrigation Efficiency</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={irrigationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="efficiency" name="Efficiency %" stroke="#39b54a" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="waterUsage" name="Water Usage (m³)" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Efficiency</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">85.3%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Water</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">3.18M m³</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Water/ha</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">2,450 m³</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Equipment Utilization</h3>
          <div className="space-y-4">
            {equipmentData.map((item) => (
              <div key={item.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.type}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.inUse} in use / {item.available} available
                  </span>
                </div>
                <div className="flex gap-1 h-2">
                  <div
                    className="bg-[#39b54a] h-2 rounded-l-full"
                    style={{ width: `${(item.inUse / (item.inUse + item.available + item.maintenance)) * 100}%` }}
                  />
                  <div
                    className="bg-[#3b82f6] h-2"
                    style={{ width: `${(item.available / (item.inUse + item.available + item.maintenance)) * 100}%` }}
                  />
                  <div
                    className="bg-[#f59e0b] h-2 rounded-r-full"
                    style={{ width: `${(item.maintenance / (item.inUse + item.available + item.maintenance)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-green-600">{item.inUse} In Use</span>
                  <span className="text-blue-600">{item.available} Available</span>
                  <span className="text-orange-600">{item.maintenance} Maintenance</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Soil Health */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Soil Health Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SoilMetricCard
            label="Average pH"
            value="6.9"
            range="Optimal (6.5-7.5)"
            status="good"
          />
          <SoilMetricCard
            label="Average Moisture"
            value="62%"
            range="Good range"
            status="good"
          />
          <SoilMetricCard
            label="Organic Matter"
            value="4.0%"
            range="Above average"
            status="good"
          />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={soilHealthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="field" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="ph" name="pH Level" fill="#8b5cf6" />
              <Bar yAxisId="left" dataKey="moisture" name="Moisture %" fill="#3b82f6" />
              <Bar yAxisId="right" dataKey="organic" name="Organic Matter %" fill="#39b54a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Production KPI Card Component
function ProductionKPICard({ title, value, subvalue, change, trend, icon: Icon, color }: any) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
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

// Soil Metric Card Component
function SoilMetricCard({ label, value, range, status }: any) {
  const statusColors = {
    good: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    warning: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    critical: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className={`p-3 rounded-lg ${statusColors[status]}`}>
      <p className="text-xs mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-75">{range}</p>
    </div>
  );
}