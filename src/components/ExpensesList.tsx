import { useState, FormEvent } from 'react';
import { Plus, Trash2, Receipt, Calendar, DollarSign, Tag } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Expense, House } from '../types';
import { User } from 'firebase/auth';
import ConfirmModal from './ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';

interface ExpensesListProps {
  expenses: Expense[];
  houses: House[];
  user: User;
}

export default function ExpensesList({ expenses, houses, user }: ExpensesListProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    houseId: '', 
    amount: 0, 
    category: 'Repair',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const categories = ['Repair', 'Utility', 'Maintenance', 'Tax', 'Insurance', 'Other'];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'expenses'), {
        ...formData,
        ownerUid: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({ houseId: '', amount: 0, category: 'Repair', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (error) {
      console.error("Error saving expense", error);
    }
  };

  const handleDelete = async (id: string) => {
    setExpenseToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseToDelete));
        setExpenseToDelete(null);
      } catch (error) {
        console.error("Error deleting expense", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('expenses')}</h1>
          <p className="text-stone-500">{t('manageProperties')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={houses.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          {t('addExpense')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {expenses.map((expense) => {
          const house = houses.find(h => h.id === expense.houseId);
          return (
            <div key={expense.id} className="bg-white p-6 rounded-3xl border border-stone-200 hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <Receipt className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => handleDelete(expense.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-bold text-stone-900">{t('currencySymbol')}{expense.amount.toLocaleString()}</h3>
                <p className="text-sm text-stone-500 font-medium">{expense.category} • {house?.name}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {expense.date}
                </div>
              </div>
              {expense.notes && (
                <p className="mt-4 text-sm text-stone-600 bg-stone-50 p-3 rounded-xl italic">
                  "{expense.notes}"
                </p>
              )}
            </div>
          );
        })}
        {expenses.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200">
            <Receipt className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium">{t('manageProperties')}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">{t('addExpense')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('selectHouse')}</label>
                <select 
                  required
                  value={formData.houseId}
                  onChange={(e) => setFormData({ ...formData, houseId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">{t('selectHouse')}</option>
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">{t('amount')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">{t('currencySymbol')}</span>
                    <input 
                      required
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">{t('date')}</label>
                  <input 
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('category')}</label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('notes')}</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  rows={3}
                  placeholder="e.g. Fixed leaking pipe in kitchen"
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
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-600/20"
                >
                  {t('saveChanges')}
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
        message={t('confirmDeleteExpense')}
      />
    </div>
  );
}
