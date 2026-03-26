import { useState, FormEvent } from 'react';
import { Plus, Trash2, Edit2, Users, Phone, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Tenant, Room, House, Payment } from '../types';
import { User } from 'firebase/auth';
import ConfirmModal from './ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

interface TenantsListProps {
  tenants: Tenant[];
  rooms: Room[];
  houses: House[];
  payments: Payment[];
  user: User;
}

export default function TenantsList({ tenants, rooms, houses, payments, user }: TenantsListProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<{id: string, roomId: string} | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    phoneNumber: '', 
    monthlyRent: 0, 
    moveInDate: new Date().toISOString().split('T')[0],
    roomId: '',
    houseId: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if room is already occupied by someone else
    const selectedRoom = rooms.find(r => r.id === formData.roomId);
    if (!selectedRoom) return;

    if (!editingTenant && selectedRoom.status === 'Occupied') {
      setError('This room is already occupied. Please select a vacant room.');
      return;
    }

    try {
      if (editingTenant) {
        // Handle room change
        if (editingTenant.roomId !== formData.roomId) {
          // Free old room
          if (editingTenant.roomId) {
            await updateDoc(doc(db, 'rooms', editingTenant.roomId), { status: 'Vacant' });
          }
          // Occupy new room
          if (formData.roomId) {
            await updateDoc(doc(db, 'rooms', formData.roomId), { status: 'Occupied' });
          }
        }
        await updateDoc(doc(db, 'tenants', editingTenant.id), formData);
      } else {
        await addDoc(collection(db, 'tenants'), {
          ...formData,
          ownerUid: user.uid,
          createdAt: new Date().toISOString()
        });
        // Update room status to Occupied
        if (formData.roomId) {
          await updateDoc(doc(db, 'rooms', formData.roomId), { status: 'Occupied' });
        }
      }
      setIsModalOpen(false);
      setEditingTenant(null);
      setError(null);
      setFormData({ name: '', phoneNumber: '', monthlyRent: 0, moveInDate: new Date().toISOString().split('T')[0], roomId: '', houseId: '' });
    } catch (error) {
      console.error("Error saving tenant", error);
    }
  };

  const handleDelete = async (id: string, roomId: string) => {
    setTenantToDelete({ id, roomId });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (tenantToDelete) {
      try {
        await deleteDoc(doc(db, 'tenants', tenantToDelete.id));
        // Update room status back to Vacant
        if (tenantToDelete.roomId) {
          await updateDoc(doc(db, 'rooms', tenantToDelete.roomId), { status: 'Vacant' });
        }
        setTenantToDelete(null);
      } catch (error) {
        console.error("Error deleting tenant", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('tenants')}</h1>
          <p className="text-stone-500">{t('manageProperties')}</p>
        </div>
        <button 
          onClick={() => {
            setEditingTenant(null);
            setFormData({ name: '', phoneNumber: '', monthlyRent: 0, moveInDate: new Date().toISOString().split('T')[0], roomId: '', houseId: houses[0]?.id || '' });
            setError(null);
            setIsModalOpen(true);
          }}
          disabled={houses.length === 0}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          {t('addTenant')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tenants.map((tenant) => {
          const house = houses.find(h => h.id === tenant.houseId);
          const room = rooms.find(r => r.id === tenant.roomId);
          const tenantPayments = payments.filter(p => p.tenantId === tenant.id);
          
          // Calculate total due based on unique months with payments
          const uniqueMonths = new Set(tenantPayments.map(p => p.month)).size;
          const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amountPaid, 0);
          const totalDue = (uniqueMonths * tenant.monthlyRent) - totalPaid;

          return (
            <div key={tenant.id} className="bg-white p-6 rounded-3xl border border-stone-200 hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-stone-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">{tenant.name}</h3>
                    <p className="text-sm text-stone-500">{house?.name} • {room?.roomNumber}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingTenant(tenant);
                        setFormData({ 
                          name: tenant.name, 
                          phoneNumber: tenant.phoneNumber, 
                          monthlyRent: tenant.monthlyRent, 
                          moveInDate: tenant.moveInDate,
                          roomId: tenant.roomId,
                          houseId: tenant.houseId
                        });
                        setError(null);
                        setIsModalOpen(true);
                      }}
                      className="p-2 hover:bg-stone-100 rounded-lg text-stone-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(tenant.id, tenant.roomId)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {totalDue !== 0 && (
                    <div className={cn(
                      "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold",
                      totalDue > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <AlertCircle className="w-3 h-3" />
                      {totalDue > 0 ? t('dueAmount') : t('advancePayment')}: {t('currencySymbol')}{Math.abs(totalDue)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl">
                  <Phone className="w-4 h-4 text-stone-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400">{t('phoneNumber')}</p>
                    <p className="text-sm font-semibold text-stone-700">{tenant.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400">{t('monthlyRent')}</p>
                    <p className="text-sm font-semibold text-stone-700">{t('currencySymbol')}{tenant.monthlyRent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl col-span-2">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400">{t('moveInDate')}</p>
                    <p className="text-sm font-semibold text-stone-700">{tenant.moveInDate}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {tenants.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200">
            <Users className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium">{t('manageProperties')}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">{editingTenant ? t('editTenant') : t('addTenant')}</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('tenantName')}</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('phoneNumber')}</label>
                <input 
                  required
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. 017XXXXXXXX"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">{t('monthlyRent')}</label>
                  <input 
                    required
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">{t('moveInDate')}</label>
                  <input 
                    required
                    type="date"
                    value={formData.moveInDate}
                    onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('selectHouse')}</label>
                <select 
                  required
                  value={formData.houseId}
                  onChange={(e) => setFormData({ ...formData, houseId: e.target.value, roomId: '' })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">{t('selectHouse')}</option>
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('selectRoom')}</label>
                <select 
                  required
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  disabled={!formData.houseId}
                >
                  <option value="">{t('selectRoom')}</option>
                  {rooms
                    .filter(r => r.houseId === formData.houseId && (r.status === 'Vacant' || r.id === editingTenant?.roomId))
                    .map(r => (
                      <option key={r.id} value={r.id}>{r.roomNumber}</option>
                    ))}
                </select>
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
                  {editingTenant ? t('saveChanges') : t('addTenant')}
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
        message={t('confirmDeleteTenant')}
      />
    </div>
  );
}
