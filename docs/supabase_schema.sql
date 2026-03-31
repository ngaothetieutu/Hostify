-- Bảng Khu vực / Tòa nhà
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  "totalFloors" INTEGER NOT NULL,
  "settingsJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Phòng
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  "buildingId" INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  "floorNumber" INTEGER NOT NULL,
  "roomNumber" TEXT NOT NULL,
  "areaM2" INTEGER NOT NULL,
  "baseRent" INTEGER NOT NULL,
  "electricityRate" INTEGER NOT NULL,
  "waterRate" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  "amenitiesJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Khách Thuê
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  phone TEXT NOT NULL,
  "idCardNumber" TEXT NOT NULL,
  "idCardFrontPath" TEXT,
  "idCardBackPath" TEXT,
  "dateOfBirth" TEXT,
  "permanentAddress" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Hợp Đồng
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  "roomId" INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  "tenantId" INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  "coTenantIds" INTEGER[],
  "startDate" TEXT NOT NULL,
  "endDate" TEXT,
  "monthlyRent" INTEGER NOT NULL,
  deposit INTEGER NOT NULL,
  "numberOfTenants" INTEGER NOT NULL DEFAULT 1,
  "servicesJson" TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'terminated')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Ghi Điện Nước
CREATE TABLE IF NOT EXISTS "meterReadings" (
  id SERIAL PRIMARY KEY,
  "roomId" INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  "electricityOld" INTEGER NOT NULL,
  "electricityNew" INTEGER NOT NULL,
  "waterOld" INTEGER NOT NULL,
  "waterNew" INTEGER NOT NULL,
  "photoPath" TEXT,
  "recordedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Hóa Đơn
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  "roomId" INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  "contractId" INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid', 'overdue')),
  "dueDate" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Chi Tiết Hóa Đơn
CREATE TABLE IF NOT EXISTS "billItems" (
  id SERIAL PRIMARY KEY,
  "billId" INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  "itemType" TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  amount INTEGER NOT NULL
);

-- Bảng Thanh Toán
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  "billId" INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'transfer')),
  note TEXT,
  "paidAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
