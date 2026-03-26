import { useState, FormEvent } from 'react';
import { Plus, MapPin, MoreVertical, Trash2, Edit2, Home } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { House, Room, Tenant } from '../types';
import { User } from 'firebase/auth';
import ConfirmModal from './ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';

interface HousesListProps {
  houses: House[];
  rooms: Room[];
  tenants: Tenant[];
  user: User;
}

export default function HousesList({ houses, rooms, tenants, user }: HousesListProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [houseToDelete, setHouseToDelete] = useState<string | null>(null);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '', totalRooms: 0, notes: '' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingHouse) {
        await updateDoc(doc(db, 'houses', editingHouse.id), formData);
      } else {
        await addDoc(collection(db, 'houses'), {
          ...formData,
          ownerUid: user.uid,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingHouse(null);
      setFormData({ name: '', location: '', totalRooms: 0, notes: '' });
    } catch (error) {
      console.error("Error saving house", error);
    }
  };

  const handleDelete = async (id: string) => {
    setHouseToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (houseToDelete) {
      try {
        await deleteDoc(doc(db, 'houses', houseToDelete));
        setHouseToDelete(null);
      } catch (error) {
        console.error("Error deleting house", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('houses')}</h1>
          <p className="text-stone-500">{t('manageProperties')}</p>
        </div>
        <button 
          onClick={() => {
            setEditingHouse(null);
            setFormData({ name: '', location: '', totalRooms: 0, notes: '' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          {t('addHouse')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {houses.map((house) => {
          const houseRooms = rooms.filter(r => r.houseId === house.id);
          const houseTenants = tenants.filter(tenant => tenant.houseId === house.id);
          const totalMonthlyRent = houseTenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);

          return (
            <div key={house.id} className="bg-white rounded-3xl border border-stone-200 overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="h-32 bg-emerald-600 flex items-center justify-center relative overflow-hidden">
                <Home className="w-16 h-16 text-white/20 absolute -bottom-4 -right-4 transform rotate-12" />
                <Home className="w-12 h-12 text-white" />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-stone-900">{house.name}</h3>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingHouse(house);
                        setFormData({ name: house.name, location: house.location, totalRooms: house.totalRooms, notes: house.notes || '' });
                        setIsModalOpen(true);
                      }}
                      className="p-2 hover:bg-stone-100 rounded-lg text-stone-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(house.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
                  <MapPin className="w-4 h-4" />
                  {house.location}
                </div>
                
                <div className="space-y-3 pt-4 border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-500">{t('totalRooms')}</span>
                    <span className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-sm font-bold">{house.totalRooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-500">{t('addedRooms')}</span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">{houseRooms.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-500">{t('totalRent')}</span>
                    <span className="text-lg font-bold text-emerald-600">{t('currencySymbol')}{totalMonthlyRent}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {houses.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200">
            <Home className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium">{t('manageProperties')}</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-emerald-600 font-bold hover:underline"
            >
              {t('addHouse')}
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">{editingHouse ? t('editHouse') : t('addHouse')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('houseName')}</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Green Valley Villa"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('location')}</label>
                <input 
                  required
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. 123 Main St, City"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('totalRooms')}</label>
                <input 
                  required
                  type="number"
                  value={formData.totalRooms}
                  onChange={(e) => setFormData({ ...formData, totalRooms: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('notes')}</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  rows={3}
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
                  {editingHouse ? t('saveChanges') : t('addHouse')}
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
        message={t('confirmDeleteHouse')}
      />
    </div>
  );
}
