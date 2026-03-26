import { useState, FormEvent } from 'react';
import { Plus, Trash2, Wallet, Calendar, DollarSign, User as UserIcon } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Payment, Tenant } from '../types';
import { User } from 'firebase/auth';
import ConfirmModal from './ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

interface PaymentsListProps {
  payments: Payment[];
  tenants: Tenant[];
  user: User;
}

export default function PaymentsList({ payments, tenants, user }: PaymentsListProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    tenantId: '', 
    month: new Date().toISOString().slice(0, 7), 
    amountPaid: 0,
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const tenant = tenants.find(t => t.id === formData.tenantId);
    if (!tenant || isMonthFullyPaid) return;

    // Calculate total paid for this month so far to determine the new dueAmount
    const paidThisMonthSoFar = payments
      .filter(p => p.tenantId === formData.tenantId && p.month === formData.month)
      .reduce((sum, p) => sum + p.amountPaid, 0);

    const dueAmount = tenant.monthlyRent - (paidThisMonthSoFar + formData.amountPaid);

    try {
      await addDoc(collection(db, 'payments'), {
        ...formData,
        dueAmount,
        roomId: tenant.roomId,
        houseId: tenant.houseId,
        ownerUid: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({ tenantId: '', month: new Date().toISOString().slice(0, 7), amountPaid: 0, paymentDate: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error("Error saving payment", error);
    }
  };

  const selectedTenant = tenants.find(t => t.id === formData.tenantId);
  const selectedTenantPayments = payments.filter(p => p.tenantId === formData.tenantId);
  
  // Calculate current balance based on unique months with payments
  const uniqueMonthsCount = new Set(selectedTenantPayments.map(p => p.month)).size;
  const totalPaidByTenant = selectedTenantPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const currentBalance = selectedTenant ? (uniqueMonthsCount * selectedTenant.monthlyRent) - totalPaidByTenant : 0;

  const paidThisMonth = payments
    .filter(p => p.tenantId === formData.tenantId && p.month === formData.month)
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const isMonthFullyPaid = selectedTenant ? paidThisMonth >= selectedTenant.monthlyRent : false;
  const remainingThisMonth = selectedTenant ? selectedTenant.monthlyRent - paidThisMonth : 0;

  const handleDelete = async (id: string) => {
    setPaymentToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (paymentToDelete) {
      try {
        await deleteDoc(doc(db, 'payments', paymentToDelete));
        setPaymentToDelete(null);
      } catch (error) {
        console.error("Error deleting payment", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('payments')}</h1>
          <p className="text-stone-500">{t('manageProperties')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={tenants.length === 0}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          {t('addPayment')}
        </button>
      </div>

      {/* Mobile View: Cards */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {payments.map((payment) => {
          const tenant = tenants.find(t => t.id === payment.tenantId);
          return (
            <div key={payment.id} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-stone-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{tenant?.name || 'Unknown'}</p>
                    <p className="text-xs text-stone-500">{payment.month}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(payment.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-50">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400 mb-1">{t('amount')}</p>
                  <p className="text-sm font-bold text-emerald-600">{t('currencySymbol')}{payment.amountPaid}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400 mb-1">{t('dueAmount')}</p>
                  <p className={cn(
                    "text-sm font-bold",
                    payment.dueAmount > 0 ? "text-rose-500" : payment.dueAmount < 0 ? "text-emerald-500" : "text-stone-400"
                  )}>
                    {payment.dueAmount < 0 ? '-' : ''}{t('currencySymbol')}{Math.abs(payment.dueAmount)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400 mb-1">{t('date')}</p>
                  <div className="flex items-center gap-2 text-stone-500">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs font-medium">{payment.paymentDate}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {payments.length === 0 && (
          <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200 text-stone-400 italic">
            {t('manageProperties')}
          </div>
        )}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden lg:block bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('tenant')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('month')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('amount')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('dueAmount')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('date')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {payments.map((payment) => {
                const tenant = tenants.find(t => t.id === payment.tenantId);
                return (
                  <tr key={payment.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-stone-500" />
                        </div>
                        <span className="font-semibold text-stone-900">{tenant?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-stone-600 font-medium">{payment.month}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-600">{t('currencySymbol')}{payment.amountPaid}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold",
                        payment.dueAmount > 0 ? "text-rose-500" : payment.dueAmount < 0 ? "text-emerald-500" : "text-stone-400"
                      )}>
                        {payment.dueAmount < 0 ? '-' : ''}{t('currencySymbol')}{Math.abs(payment.dueAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-500 text-sm">{payment.paymentDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">
                    {t('manageProperties')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">{t('addPayment')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('selectTenant')}</label>
                <select 
                  required
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">{t('selectTenant')}</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name} ({t('currencySymbol')}{tenant.monthlyRent})</option>
                  ))}
                </select>
                {selectedTenant && (
                  <div className={cn(
                    "mt-2 p-3 rounded-xl flex items-center justify-between text-sm font-bold",
                    currentBalance > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    <span>{currentBalance > 0 ? t('dueAmount') : t('advancePayment')} ({t('total')}):</span>
                    <span>{t('currencySymbol')}{Math.abs(currentBalance).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('month')}</label>
                <input 
                  required
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
                {selectedTenant && (
                  <div className={cn(
                    "mt-2 p-3 rounded-xl flex items-center justify-between text-sm font-bold",
                    isMonthFullyPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    <span>{isMonthFullyPaid ? t('monthFullyPaid') : `${t('remaining')} (${formData.month}):`}</span>
                    {!isMonthFullyPaid && <span>{t('currencySymbol')}{remainingThisMonth.toLocaleString()}</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('amount')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">{t('currencySymbol')}</span>
                  <input 
                    required
                    disabled={isMonthFullyPaid}
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: parseInt(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:bg-stone-50 disabled:text-stone-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('date')}</label>
                <input 
                  required
                  disabled={isMonthFullyPaid}
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:bg-stone-50 disabled:text-stone-400"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={isMonthFullyPaid}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('addPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('delete')}
        message={t('confirmDeletePayment')}
      />
    </div>
  );
}
