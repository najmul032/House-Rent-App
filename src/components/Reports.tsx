import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Payment, Expense, House } from '../types';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

interface ReportsProps {
  payments: Payment[];
  expenses: Expense[];
  houses: House[];
}

export default function Reports({ payments, expenses, houses }: ReportsProps) {
  const { t, language } = useLanguage();
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const years = Array.from({ length: 2030 - 2020 + 1 }, (_, i) => 2030 - i);

  // Monthly data for the selected year
  const months = eachMonthOfInterval({
    start: startOfYear(new Date(reportYear, 0, 1)),
    end: endOfYear(new Date(reportYear, 0, 1))
  });

  const monthlyData = months.map(month => {
    const monthStr = format(month, 'yyyy-MM');
    const income = payments
      .filter(p => p.month === monthStr)
      .reduce((acc, curr) => acc + curr.amountPaid, 0);
    const expense = expenses
      .filter(e => e.date.startsWith(monthStr))
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    return {
      name: format(month, 'MMM'),
      [t('income')]: income,
      [t('expenses')]: expense,
      [t('profit')]: income - expense
    };
  });

  // House breakdown
  const houseData = houses.map(house => {
    const income = payments
      .filter(p => p.houseId === house.id)
      .reduce((acc, curr) => acc + curr.amountPaid, 0);
    const expense = expenses
      .filter(e => e.houseId === house.id)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    return {
      name: house.name,
      [t('income')]: income,
      [t('expenses')]: expense,
      [t('profit')]: income - expense
    };
  });

  const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('reports')}</h1>
          <p className="text-stone-500">{t('manageProperties')}</p>
        </div>
        <select 
          value={reportYear}
          onChange={(e) => setReportYear(parseInt(e.target.value))}
          className="w-full sm:w-auto bg-white border border-stone-200 rounded-xl px-4 py-2 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">{t('monthlyPerformance')} ({reportYear})</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey={t('income')} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t('expenses')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">{t('incomeByHouse')}</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={houseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey={t('income')}
                >
                  {houseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100">
          <h3 className="text-lg font-bold text-stone-900">{t('houseWiseSummary')}</h3>
        </div>
        
        {/* Mobile View: Summary Cards */}
        <div className="grid grid-cols-1 divide-y divide-stone-100 lg:hidden">
          {houseData.map((data, i) => (
            <div key={i} className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-stone-900">{data.name}</h4>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  data[t('profit')] >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                )}>
                  {t('profit')}: {t('currencySymbol')}{data[t('profit')].toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400 mb-1">{t('totalIncome')}</p>
                  <p className="text-sm font-bold text-emerald-600">{t('currencySymbol')}{data[t('income')].toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400 mb-1">{t('totalExpenses')}</p>
                  <p className="text-sm font-bold text-rose-600">{t('currencySymbol')}{data[t('expenses')].toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Summary Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('houseName')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('totalIncome')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('totalExpenses')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('netProfit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {houseData.map((data, i) => (
                <tr key={i} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-stone-900">{data.name}</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">{t('currencySymbol')}{data[t('income')].toLocaleString()}</td>
                  <td className="px-6 py-4 text-rose-600 font-bold">{t('currencySymbol')}{data[t('expenses')].toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "font-bold",
                      data[t('profit')] >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {t('currencySymbol')}{data[t('profit')].toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
