export interface House {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  notes?: string;
  ownerUid: string;
  createdAt: string;
}

export interface Room {
  id: string;
  houseId: string;
  roomNumber: string;
  status: 'Occupied' | 'Vacant';
  ownerUid: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  roomId: string;
  houseId: string;
  name: string;
  phoneNumber: string;
  monthlyRent: number;
  moveInDate: string;
  ownerUid: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  roomId: string;
  houseId: string;
  month: string; // YYYY-MM
  amountPaid: number;
  dueAmount: number;
  paymentDate: string;
  ownerUid: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  houseId: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  ownerUid: string;
  createdAt: string;
}
