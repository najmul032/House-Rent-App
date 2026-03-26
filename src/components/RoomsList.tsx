import { useState, FormEvent } from 'react';
import { Plus, Trash2, Edit2, DoorOpen, Search, Filter, LogOut, Users, AlertTriangle, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Room, House, Tenant } from '../types';
import { User } from 'firebase/auth';
import ConfirmModal from './ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';

interface RoomsListProps {
  rooms: Room[];
  houses: House[];
  tenants: Tenant[];
  user: User;
}

export default function RoomsList({ rooms, houses, tenants, user }: RoomsListProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({ houseId: '', roomNumber: '', status: 'Vacant' as 'Occupied' | 'Vacant' });
  const [error, setError] = useState<string | null>(null);
  const [filterHouse, setFilterHouse] = useState('all');
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [checkoutInfo, setCheckoutInfo] = useState<{roomId: string, tenantId?: string} | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const selectedHouse = houses.find(h => h.id === formData.houseId);
    if (!selectedHouse) return;

    // If adding a new room, check if the limit is reached
    if (!editingRoom) {
      const existingRoomsCount = rooms.filter(r => r.houseId === formData.houseId).length;
      if (existingRoomsCount >= selectedHouse.totalRooms) {
        setError(`Limit reached! This house can only have ${selectedHouse.totalRooms} rooms.`);
        return;
      }
    }

    try {
      if (editingRoom) {
        await updateDoc(doc(db, 'rooms', editingRoom.id), formData);
      } else {
        await addDoc(collection(db, 'rooms'), {
          ...formData,
          ownerUid: user.uid,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingRoom(null);
      setFormData({ houseId: '', roomNumber: '', status: 'Vacant' });
    } catch (error) {
      console.error("Error saving room", error);
    }
  };

  const handleDelete = async (id: string) => {
    setRoomToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (roomToDelete) {
      try {
        await deleteDoc(doc(db, 'rooms', roomToDelete));
        setRoomToDelete(null);
      } catch (error) {
        console.error("Error deleting room", error);
      }
    }
  };

  const handleCheckout = (roomId: string, tenantId?: string) => {
    setCheckoutInfo({ roomId, tenantId });
    setIsCheckoutConfirmOpen(true);
  };

  const confirmCheckout = async () => {
    if (checkoutInfo) {
      try {
        // Update room status to Vacant
        await updateDoc(doc(db, 'rooms', checkoutInfo.roomId), { status: 'Vacant' });
        
        // If there's a tenant, delete them
        if (checkoutInfo.tenantId) {
          await deleteDoc(doc(db, 'tenants', checkoutInfo.tenantId));
        }
        
        setIsCheckoutConfirmOpen(false);
        setCheckoutInfo(null);
      } catch (error) {
        console.error("Error during checkout", error);
      }
    }
  };

  const filteredRooms = filterHouse === 'all' 
    ? rooms 
    : rooms.filter(r => r.houseId === filterHouse);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('rooms')}</h1>
          <p className="text-stone-500">{t('manageProperties')}</p>
        </div>
        <button 
          onClick={() => {
            setEditingRoom(null);
            setFormData({ houseId: houses[0]?.id || '', roomNumber: '', status: 'Vacant' });
            setError(null);
            setIsModalOpen(true);
          }}
          disabled={houses.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          {t('addRoom')}
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-stone-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">{t('filterByHouse')}:</span>
        </div>
        <select 
          value={filterHouse}
          onChange={(e) => setFilterHouse(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">{t('allHouses')}</option>
          {houses.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredRooms.map((room) => {
          const house = houses.find(h => h.id === room.houseId);
          const tenant = tenants.find(t => t.roomId === room.id);

          return (
            <div key={room.id} className="bg-white p-6 rounded-3xl border border-stone-200 hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  room.status === 'Occupied' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                )}>
                  <DoorOpen className="w-6 h-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {room.status === 'Occupied' && (
                    <button 
                      onClick={() => handleCheckout(room.id, tenant?.id)}
                      className="p-2 hover:bg-amber-50 rounded-lg text-amber-500"
                      title={t('checkout')}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setEditingRoom(room);
                      setFormData({ houseId: room.houseId, roomNumber: room.roomNumber, status: room.status });
                      setError(null);
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-stone-100 rounded-lg text-stone-500"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(room.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-stone-900">{room.roomNumber}</h3>
              <p className="text-sm text-stone-500 mb-2">{house?.name || 'Unknown House'}</p>
              
              {tenant && (
                <div className="flex items-center gap-2 text-stone-600 mb-4 bg-stone-50 p-2 rounded-xl">
                  <Users className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-semibold truncate">{tenant.name}</span>
                </div>
              )}

              <div className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
                room.status === 'Occupied' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              )}>
                {room.status === 'Occupied' ? t('occupied') : t('vacant')}
              </div>
            </div>
          );
        })}
        {filteredRooms.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200">
            <DoorOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium">{t('manageProperties')}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">{editingRoom ? t('editRoom') : t('addRoom')}</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

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
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('roomNumber')}</label>
                <input 
                  required
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Room 101"
                />
              </div>
              {editingRoom && (
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">{t('status')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'Vacant' })}
                      className={cn(
                        "py-3 rounded-xl font-semibold transition-all border",
                        formData.status === 'Vacant' ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-white border-stone-200 text-stone-500"
                      )}
                    >
                      {t('vacant')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'Occupied' })}
                      className={cn(
                        "py-3 rounded-xl font-semibold transition-all border",
                        formData.status === 'Occupied' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-stone-200 text-stone-500"
                      )}
                    >
                      {t('occupied')}
                    </button>
                  </div>
                </div>
              )}
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
                  {editingRoom ? t('saveChanges') : t('addRoom')}
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
        message={t('confirmDeleteRoom')}
      />

      <ConfirmModal 
        isOpen={isCheckoutConfirmOpen}
        onClose={() => setIsCheckoutConfirmOpen(false)}
        onConfirm={confirmCheckout}
        title={t('checkout')}
        message={t('confirmDeleteTenant')}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
