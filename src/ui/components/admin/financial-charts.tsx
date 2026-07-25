// src/app/admin/analytics/components/financial-charts.tsx
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Landmark,
  Receipt,
} from "lucide-react";

export default function FinancialCharts({ data }: { data: any }) {
  // Sample data - replace with actual data from props
  const revenueData = [
    { month: "Jan", revenue: 125000, expenses: 85000, profit: 40000 },
    { month: "Feb", revenue: 142000, expenses: 92000, profit: 50000 },
    { month: "Mar", revenue: 158000, expenses: 98000, profit: 60000 },
    { month: "Apr", revenue: 169000, expenses: 105000, profit: 64000 },
    { month: "May", revenue: 185000, expenses: 112000, profit: 73000 },
    { month: "Jun", revenue: 210000, expenses: 125000, profit: 85000 },
  ];

  const transactionVolumeData = [
    { day: "Mon", count: 145, volume: 45000 },
    { day: "Tue", count: 132, volume: 42000 },
    { day: "Wed", count: 168, volume: 52000 },
    { day: "Thu", count: 155, volume: 48000 },
    { day: "Fri", count: 189, volume: 61000 },
    { day: "Sat", count: 98, volume: 28000 },
    { day: "Sun", count: 67, volume: 19000 },
  ];

  const paymentMethodData = [
    { name: "Bank Transfer", value: 45 },
    { name: "Card Payment", value: 25 },
    { name: "Cash", value: 15 },
    { name: "Wallet Transfer", value: 10 },
    { name: "Invoice", value: 5 },
  ];

  const walletBalanceData = [
    { name: "EMAP Wallets", value: 850000 },
    { name: "EMAPS Wallets", value: 1250000 },
    { name: "EMMP Wallets", value: 2100000 },
    { name: "Community Wallets", value: 450000 },
  ];

  const invoiceStatusData = [
    { status: "Paid", value: 68 },
    { status: "Pending", value: 22 },
    { status: "Overdue", value: 10 },
  ];

  const COLORS = ["#39b54a", "#8cc63f", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

  const totalBalance = (data?.wallets?.balance || 425000000) / 100;
  const totalTransactions = data?.transactions?.volume || 954;
  const avgTransaction = (data?.transactions?.avgValue || 125000) / 100;
  const pendingPayments = data?.payments?.pending || 23;
  const overdueInvoices = data?.payments?.overdue || 8;

  return (
    <div className="space-y-6">
      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialKPICard
          title="Total Wallet Balance"
          value={`₦${(totalBalance / 1000000).toFixed(2)}M`}
          change="+8.5%"
          trend="up"
          icon={Wallet}
          color="green"
        />
        <FinancialKPICard
          title="Transaction Volume"
          value={totalTransactions.toLocaleString()}
          change="+12.3%"
          trend="up"
          icon={CreditCard}
          color="blue"
        />
        <FinancialKPICard
          title="Avg Transaction"
          value={`₦${(avgTransaction / 1000).toFixed(1)}K`}
          change="+3.2%"
          trend="up"
          icon={DollarSign}
          color="purple"
        />
        <FinancialKPICard
          title="Overdue Invoices"
          value={overdueInvoices}
          change="-5.1%"
          trend="down"
          icon={Receipt}
          color="red"
        />
      </div>

      {/* Revenue & Profit Chart */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue & Profit Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#39b54a" />
              <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill="#f59e0b" />
              <Line yAxisId="right" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction Volume & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Daily Transaction Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transactionVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Transaction Count" fill="#39b54a" />
                <Bar yAxisId="right" dataKey="volume" name="Volume (₦)" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Wallet Distribution & Invoice Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Wallet Balance Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={walletBalanceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {walletBalanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Invoice Status</h3>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="flex justify-center gap-4 mb-6">
                <div>
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2 dark:bg-green-900/30">
                    <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{invoiceStatusData[0].value}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                </div>
                <div>
                  <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2 dark:bg-yellow-900/30">
                    <Receipt className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{invoiceStatusData[1].value}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                </div>
                <div>
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2 dark:bg-red-900/30">
                    <Receipt className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{invoiceStatusData[2].value}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Receivables:</span>
                  <span className="font-medium text-gray-900 dark:text-white">₦2.4M</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Avg Days to Pay:</span>
                  <span className="font-medium text-gray-900 dark:text-white">18 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Projection */}
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cash Flow Projection</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { month: "Jul", inflow: 220, outflow: 140, net: 80 },
              { month: "Aug", inflow: 235, outflow: 155, net: 80 },
              { month: "Sep", inflow: 250, outflow: 165, net: 85 },
              { month: "Oct", inflow: 265, outflow: 175, net: 90 },
              { month: "Nov", inflow: 280, outflow: 185, net: 95 },
              { month: "Dec", inflow: 310, outflow: 200, net: 110 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="inflow" name="Inflow (₦K)" stroke="#39b54a" fill="#39b54a80" />
              <Area type="monotone" dataKey="outflow" name="Outflow (₦K)" stroke="#f59e0b" fill="#f59e0b80" />
              <Line type="monotone" dataKey="net" name="Net (₦K)" stroke="#3b82f6" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Financial KPI Card Component
function FinancialKPICard({ title, value, change, trend, icon: Icon, color }: any) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
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