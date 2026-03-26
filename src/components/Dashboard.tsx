import { 
  Home, 
  DoorOpen, 
  Users, 
  Wallet, 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { House, Room, Tenant, Payment, Expense } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  houses: House[];
  rooms: Room[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
}

export default function Dashboard({ houses, rooms, tenants, payments, expenses }: DashboardProps) {
  const { t } = useLanguage();
  const totalRentCollected = payments.reduce((acc, curr) => acc + curr.amountPaid, 0);
  
  // Calculate total due based on unique months with payments for each tenant
  const totalDue = tenants.reduce((acc, tenant) => {
    const tenantPayments = payments.filter(p => p.tenantId === tenant.id);
    const uniqueMonths = new Set(tenantPayments.map(p => p.month)).size;
    const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    return acc + (uniqueMonths * tenant.monthlyRent - totalPaid);
  }, 0);

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRentCollected - totalExpenses;

  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const vacantRooms = rooms.filter(r => r.status === 'Vacant').length;

  const stats = [
    { label: houses.length === 1 ? t('houses') : t('houses'), value: houses.length, icon: Home, color: 'bg-blue-500' },
    { label: t('totalRooms'), value: rooms.length, icon: DoorOpen, color: 'bg-purple-500' },
    { label: t('occupied'), value: occupiedRooms, icon: Users, color: 'bg-emerald-500' },
    { label: t('vacant'), value: vacantRooms, icon: DoorOpen, color: 'bg-amber-500' },
    { label: t('totalRentCollected'), value: `${t('currencySymbol')}${totalRentCollected.toLocaleString()}`, icon: Wallet, color: 'bg-emerald-600' },
    { 
      label: totalDue >= 0 ? t('dueAmount') : t('advancePayment'), 
      value: `${t('currencySymbol')}${Math.abs(totalDue).toLocaleString()}`, 
      icon: DollarSign, 
      color: totalDue >= 0 ? 'bg-red-500' : 'bg-emerald-500' 
    },
    { label: t('totalExpenses'), value: `${t('currencySymbol')}${totalExpenses.toLocaleString()}`, icon: Receipt, color: 'bg-rose-500' },
    { label: t('netProfit'), value: `${t('currencySymbol')}${netProfit.toLocaleString()}`, icon: TrendingUp, color: 'bg-indigo-600' },
  ];

  // Prepare chart data (last 6 months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  }).reverse();

  const chartData = last6Months.map(month => {
    const monthPayments = payments.filter(p => p.month === month).reduce((acc, curr) => acc + curr.amountPaid, 0);
    const monthExpenses = expenses.filter(e => e.date.startsWith(month)).reduce((acc, curr) => acc + curr.amount, 0);
    return {
      name: month,
      [t('income')]: monthPayments,
      [t('expense')]: monthExpenses,
    };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-2xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-stone-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">{t('financialOverview')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f5f5f4' }}
                />
                <Bar dataKey={t('income')} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t('expense')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">{t('dashboard')}</h3>
          <div className="space-y-4">
            {payments.slice(-5).reverse().map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{t('payments')}</p>
                    <p className="text-xs text-stone-500">{p.month}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-emerald-600">+{t('currencySymbol')}{p.amountPaid}</p>
              </div>
            ))}
            {expenses.slice(-5).reverse().map((e, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{e.category}</p>
                    <p className="text-xs text-stone-500">{e.date}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-rose-600">-{t('currencySymbol')}{e.amount}</p>
              </div>
            ))}
            {payments.length === 0 && expenses.length === 0 && (
              <div className="text-center py-12 text-stone-400 italic">
                {t('manageProperties')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
