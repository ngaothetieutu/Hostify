import Dexie, { type EntityTable } from 'dexie';

// ─── Interfaces ───

export interface Building {
  id?: number;
  name: string;
  address: string;
  totalFloors: number;
  settingsJson: string;
  createdAt: Date;
}

export interface Room {
  id?: number;
  buildingId: number;
  floorNumber: number;
  roomNumber: string;
  areaM2: number;
  baseRent: number;
  electricityRate: number;
  waterRate: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  amenitiesJson: string;
  createdAt: Date;
}

export interface Tenant {
  id?: number;
  fullName: string;
  phone: string;
  idCardNumber: string;
  idCardFrontPath?: string;
  idCardBackPath?: string;
  dateOfBirth?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status?: 'active' | 'inactive';
  createdAt: Date;
}

// Services selected for a contract
export interface ContractService {
  serviceId: string;  // matches SERVICE_TYPES[].id
  enabled: boolean;
  price: number;      // custom price (can differ from default)
}

export interface Contract {
  id?: number;
  roomId: number;
  tenantId: number;
  coTenantIds?: number[]; // Additional tenants
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  deposit: number;
  numberOfTenants: number;    // for per-person service calculation
  servicesJson: string;       // JSON array of ContractService
  status: 'active' | 'expired' | 'terminated';
  createdAt: Date;
}

export interface MeterReading {
  id?: number;
  roomId: number;
  year: number;
  month: number;
  electricityOld: number;
  electricityNew: number;
  waterOld: number;
  waterNew: number;
  photoPath?: string;
  recordedAt: Date;
}

export interface Bill {
  id?: number;
  roomId: number;
  contractId?: number;
  year: number;
  month: number;
  totalAmount: number;
  status: 'unpaid' | 'paid' | 'overdue';
  dueDate?: string;
  createdAt: Date;
}

export interface BillItem {
  id?: number;
  billId: number;
  itemType: 'rent' | 'electricity' | 'water' | 'washing' | 'elevator' | 'cleaning' | 'wifi' | 'parking' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id?: number;
  billId: number;
  amount: number;
  method: 'cash' | 'transfer';
  note: string;
  paidAt: Date;
}

// ─── Database Class ───

class QLPhongTroDB extends Dexie {
  buildings!: EntityTable<Building, 'id'>;
  rooms!: EntityTable<Room, 'id'>;
  tenants!: EntityTable<Tenant, 'id'>;
  contracts!: EntityTable<Contract, 'id'>;
  meterReadings!: EntityTable<MeterReading, 'id'>;
  bills!: EntityTable<Bill, 'id'>;
  billItems!: EntityTable<BillItem, 'id'>;
  payments!: EntityTable<Payment, 'id'>;

  constructor() {
    super('qlphongtro');

    this.version(1).stores({
      buildings: '++id, name',
      rooms: '++id, buildingId, status, roomNumber',
      tenants: '++id, fullName, phone',
      contracts: '++id, roomId, tenantId, status',
      meterReadings: '++id, roomId, [year+month], [roomId+year+month]',
      bills: '++id, roomId, contractId, status, [year+month]',
      billItems: '++id, billId, itemType',
      payments: '++id, billId',
    });

    // v2: Add numberOfTenants + servicesJson to contracts
    this.version(2).stores({
      buildings: '++id, name',
      rooms: '++id, buildingId, status, roomNumber',
      tenants: '++id, fullName, phone',
      contracts: '++id, roomId, tenantId, status',
      meterReadings: '++id, roomId, [year+month], [roomId+year+month]',
      bills: '++id, roomId, contractId, status, [year+month]',
      billItems: '++id, billId, itemType',
      payments: '++id, billId',
    }).upgrade((tx) => {
      return tx.table('contracts').toCollection().modify((contract) => {
        if (!contract.numberOfTenants) contract.numberOfTenants = 1;
        if (!contract.servicesJson) contract.servicesJson = '[]';
      });
    });
  }
}

export const db = new QLPhongTroDB();
