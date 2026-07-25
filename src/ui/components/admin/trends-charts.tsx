// src/app/admin/analytics/components/trends-charts.tsx
"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Eye,
} from "lucide-react";

export default function TrendsCharts({ data }: { data: any }) {
  // Sample data - replace with actual data from props
  const growthData = [
    { month: "Jan", parties: 45, farms: 32, harvests: 28 },
    { month: "Feb", parties: 52, farms: 38, harvests: 34 },
    { month: "Mar", parties: 68, farms: 45, harvests: 42 },
    { month: "Apr", parties: 75, farms: 52, harvests: 48 },
    { month: "May", parties: 89, farms: 61, harvests: 55 },
    { month: "Jun", parties: 102, farms: 70, harvests: 64 },
    { month: "Jul", parties: 118, farms: 82, harvests: 75 },
    { month: "Aug", parties: 135, farms: 95, harvests: 88 },
    { month: "Sep", parties: 152, farms: 108, harvests: 102 },
    { month: "Oct", parties: 168, farms: 122, harvests: 115 },
    { month: "Nov", parties: 185, farms: 138, harvests: 130 },
    { month: "Dec", parties: 205, farms: 155, harvests: 148 },
  ];

  const forecastData = [
    { month: "Jan", actual: 148, forecast: null },
    { month: "Feb", actual: 162, forecast: null },
    { month: "Mar", actual: 175, forecast: null },
    { month: "Apr", actual: 189, forecast: null },
    { month: "May", actual: 203, forecast: null },
    { month: "Jun", actual: 218, forecast: null },
    { month: "Jul", actual: 235, forecast: null },
    { month: "Aug", actual: null, forecast: 248 },
    { month: "Sep", actual: null, forecast: 262 },
    { month: "Oct", actual: null, forecast: 278 },
    { month: "Nov", actual: null, forecast: 295 },
    { month: "Dec", actual: null, forecast: 315 },
  ];

  const yoyComparisonData = [
    { metric: "Parties", lastYear: 145, thisYear: 205, growth: 41.4 },
    { metric: "Farms", lastYear: 98, thisYear: 155, growth: 58.2 },
    { metric: "Harvests", lastYear: 102, thisYear: 148, growth: 45.1 },
    { metric: "Revenue", lastYear: 1250, thisYear: 1850, growth: 48.0 },
    { metric: "Export Volume", lastYear: 2100, thisYear: 3250, growth: 54.8 },
  ];

  const seasonalPatterns = [
    { month: "Jan", index: 85 },
    { month: "Feb", index: 88 },
    { month: "Mar", index: 95 },
    { month: "Apr", index: 102 },
    { month: "May", index: 115 },
    { month: "Jun", index: 125 },
    { month: "Jul", index: 132 },
    { month: "Aug", index: 128 },
    { month: "Sep", index: 118 },
    { month: "Oct", index: 105 },
    { month: "Nov", index: 95 },
    { month: "Dec", index: 90 },
  ];

  const growthRate = 41.2;
  const projectedGrowth = 35.8;
  const confidenceInterval = 92;

  return (
    <div className="space-y-6">
      {/* Trends KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendsKPICard
          title="YoY Growth"
          value={`+${growthRate}%`}
          change="vs last year"
          trend="up"
          icon={TrendingUp}
          color="green"
        />
        <TrendsKPICard
          title="Projected Growth"
          value={`+${projectedGrowth}%`}
          change="next 12 months"
          trend="up"
          icon={Target}
          color="blue"
        />
        <TrendsKPICard
          title="Confidence"
          value={`${confidenceInterval}%`}
          change="forecast accuracy"
          trend="up"
          icon={Activity}
          color="purple"
        />
        <TrendsKPICard
          title="Peak Season"
          value="Jun-Jul"
          change="highest activity"
          trend="up"
          icon={Calendar}
          color="orange"
        />
      </div>

      {/* Growth Trends */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Platform Growth Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="parties" name="Parties" stroke="#39b54a" strokeWidth={2} />
              <Line type="monotone" dataKey="farms" name="Farms" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="harvests" name="Harvests" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast & Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Harvest Volume Forecast</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" name="Actual" fill="#39b54a" />
                <Bar dataKey="forecast" name="Forecast" fill="#94a3b8" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Year-over-Year Comparison</h3>
          <div className="space-y-4">
            {yoyComparisonData.map((item) => (
              <div key={item.metric}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.metric}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.lastYear} → {item.thisYear}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#39b54a] h-2 rounded-full"
                    style={{ width: `${Math.min(item.growth, 100)}%` }}
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-green-600">+{item.growth}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seasonal Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Seasonal Patterns</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seasonalPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="index" name="Seasonal Index" stroke="#39b54a" fill="#39b54a80" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Seasonal index based on historical data (100 = annual average)
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Growth Insights</h3>
          <div className="space-y-4">
            <InsightCard
              title="Accelerating Growth"
              description="Party registrations have increased 41% YoY, driven by community onboarding."
              impact="positive"
              metric="+41%"
            />
            <InsightCard
              title="Peak Harvest Season"
              description="June-July shows 32% higher harvest volume than annual average."
              impact="positive"
              metric="+32%"
            />
            <InsightCard
              title="Export Expansion"
              description="New GCC markets driving 54% increase in export volume."
              impact="positive"
              metric="+54%"
            />
            <InsightCard
              title="Q4 Projection"
              description="Expected to reach 350+ parties by year end, exceeding target by 12%."
              impact="positive"
              metric="12% above"
            />
          </div>
        </div>
      </div>

      {/* Predictive Analytics */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Predictive Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PredictionCard
            title="Next Month Harvest"
            value="185 t"
            confidence={94}
            change="+8.2%"
            trend="up"
          />
          <PredictionCard
            title="Q4 Revenue"
            value="₦4.2M"
            confidence={88}
            change="+15.3%"
            trend="up"
          />
          <PredictionCard
            title="New Parties (30d)"
            value="45"
            confidence={91}
            change="+22.5%"
            trend="up"
          />
        </div>
      </div>
    </div>
  );
}

// Trends KPI Card Component
function TrendsKPICard({ title, value, change, trend, icon: Icon, color }: any) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
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
        <p className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          {change}
        </p>
      </div>
    </div>
  );
}

// Insight Card Component
function InsightCard({ title, description, impact, metric }: any) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex justify-between items-start">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
        <span className="text-sm font-bold text-green-600">{metric}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </div>
  );
}

// Prediction Card Component
function PredictionCard({ title, value, confidence, change, trend }: any) {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-[#39b54a]/10 to-[#8cc63f]/10 dark:from-[#39b54a]/20 dark:to-[#8cc63f]/20">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{value}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Confidence:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{confidence}%</span>
        </div>
        <span className={`text-xs flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change}
        </span>
      </div>
    </div>
  );
}