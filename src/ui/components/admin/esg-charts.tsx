// src/app/admin/analytics/components/esg-charts.tsx
"use client";

import {
  BarChart,
  Bar,
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
} from "recharts";
import {
  Users,
  Leaf,
  Droplets,
  Award,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Heart,
  Users2,
  TreePine,
  Wind,
  Sun,
  Recycle,
  Target,
} from "lucide-react";

export default function ESGCharts({ data }: { data: any }) {
  // Sample data - replace with actual data from props
  const communityData = [
    { name: "Active Members", value: data?.communities?.members || 2450 },
    { name: "SPV Beneficiaries", value: data?.communities?.spvBeneficiaries || 368 },
    { name: "Women Farmers", value: data?.workforce?.womenFarmers || 890 },
    { name: "Youth Farmers", value: data?.workforce?.youthFarmers || 1200 },
  ];

  const demographicData = [
    { category: "Men", value: data?.workforce?.totalJobs - (data?.workforce?.womenFarmers || 0) || 1560 },
    { category: "Women", value: data?.workforce?.womenFarmers || 890 },
    { category: "Youth (18-35)", value: data?.workforce?.youthFarmers || 1200 },
    { category: "Elderly (65+)", value: data?.workforce?.totalJobs - (data?.workforce?.youthFarmers || 0) - 1560 || 250 },
  ];

  const environmentalData = [
    { metric: "Water Usage", value: (data?.environment?.waterUsage || 2450000) / 1000000, unit: "M L" },
    { metric: "Carbon Footprint", value: (data?.environment?.carbonFootprint || 125000) / 1000, unit: "t CO2" },
    { metric: "Training Hours", value: data?.training || 1250, unit: "hrs" },
  ];

  const monthlyImpactData = [
    { month: "Jan", water: 180, carbon: 12, training: 85 },
    { month: "Feb", water: 165, carbon: 11, training: 92 },
    { month: "Mar", water: 190, carbon: 13, training: 110 },
    { month: "Apr", water: 210, carbon: 14, training: 105 },
    { month: "May", water: 230, carbon: 16, training: 130 },
    { month: "Jun", water: 245, carbon: 17, training: 125 },
  ];

  const spvDistributionData = [
    { name: "Host Communities", value: 45 },
    { name: "Fulani Pastoralists", value: 30 },
    { name: "Women Groups", value: 15 },
    { name: "Youth Cooperatives", value: 10 },
  ];

  const COLORS = ["#39b54a", "#8cc63f", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6">
      {/* ESG KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ESGKPICard
          title="Community Members"
          value={data?.communities?.members?.toLocaleString() || "2,450"}
          change="+12.5%"
          trend="up"
          icon={Users}
          color="green"
        />
        <ESGKPICard
          title="SPV Beneficiaries"
          value={data?.communities?.spvBeneficiaries?.toString() || "368"}
          change="+8.3%"
          trend="up"
          icon={Target}
          color="blue"
        />
        <ESGKPICard
          title="Water Saved"
          value={`${((data?.environment?.waterUsage || 2450000) / 1000000).toFixed(1)}M L`}
          change="-5.2%"
          trend="down"
          icon={Droplets}
          color="cyan"
        />
        <ESGKPICard
          title="Training Hours"
          value={data?.training?.toString() || "1,250"}
          change="+15.7%"
          trend="up"
          icon={Award}
          color="purple"
        />
      </div>

      {/* Community Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Community Impact Metrics</h3>
          <div className="space-y-4">
            {communityData.map((item, index) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{item.value.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#39b54a] h-2 rounded-full"
                    style={{ width: `${(item.value / Math.max(...communityData.map(d => d.value))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">SPV Equity Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spvDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {spvDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Workforce Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Workforce Demographics</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographicData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {demographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Gender Distribution</h3>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="flex justify-center gap-8 mb-6">
                <div>
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2 dark:bg-blue-900/30">
                    <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {demographicData[0]?.value || 1560}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Men</p>
                </div>
                <div>
                  <div className="w-24 h-24 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-2 dark:bg-pink-900/30">
                    <Heart className="h-12 w-12 text-pink-600 dark:text-pink-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {demographicData[1]?.value || 890}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Women</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Women represent {Math.round((890 / (1560 + 890)) * 100)}% of workforce
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Impact */}
      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Environmental Impact Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {environmentalData.map((item, index) => (
              <div key={item.metric} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.metric}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.value.toFixed(1)} {item.unit}
                </p>
              </div>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyImpactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="water" name="Water (M L)" stroke="#3b82f6" fill="#3b82f680" />
                <Area yAxisId="right" type="monotone" dataKey="carbon" name="Carbon (t)" stroke="#f59e0b" fill="#f59e0b80" />
                <Area yAxisId="left" type="monotone" dataKey="training" name="Training (hrs)" stroke="#39b54a" fill="#39b54a80" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SDG Alignment */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">SDG Alignment</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SDGBadge
            number="1"
            title="No Poverty"
            progress={75}
            color="bg-red-500"
          />
          <SDGBadge
            number="2"
            title="Zero Hunger"
            progress={82}
            color="bg-orange-500"
          />
          <SDGBadge
            number="5"
            title="Gender Equality"
            progress={68}
            color="bg-pink-500"
          />
          <SDGBadge
            number="8"
            title="Decent Work"
            progress={88}
            color="bg-purple-500"
          />
          <SDGBadge
            number="12"
            title="Responsible Consumption"
            progress={71}
            color="bg-yellow-500"
          />
          <SDGBadge
            number="13"
            title="Climate Action"
            progress={64}
            color="bg-green-500"
          />
          <SDGBadge
            number="15"
            title="Life on Land"
            progress={79}
            color="bg-emerald-500"
          />
          <SDGBadge
            number="17"
            title="Partnerships"
            progress={92}
            color="bg-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

// ESG KPI Card Component
function ESGKPICard({ title, value, change, trend, icon: Icon, color }: any) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
    pink: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
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
          {trend === 'up' ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
          {change} vs previous period
        </p>
      </div>
    </div>
  );
}

// SDG Badge Component
function SDGBadge({ number, title, progress, color }: any) {
  return (
    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center mx-auto mb-2 text-white font-bold`}>
        {number}
      </div>
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{progress}%</p>
    </div>
  );
}