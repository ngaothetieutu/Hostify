import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import RoomForm from './pages/RoomForm';
import Tenants from './pages/Tenants';
import ContractForm from './pages/ContractForm';
import Bills from './pages/Bills';
import BillCreate from './pages/BillCreate';
import BillDetail from './pages/BillDetail';
import Meters from './pages/Meters';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function App() {
  return (
    <GoogleOAuthProvider clientId="899592363752-m95otsotlhm5f94lmssmjud76oe14f2q.apps.googleusercontent.com">
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/create" element={<RoomForm />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/tenants/:id" element={<Tenants />} />
          <Route path="/contracts/create" element={<ContractForm />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/create" element={<BillCreate />} />
          <Route path="/bills/:id" element={<BillDetail />} />
          <Route path="/meters" element={<Meters />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/backup" element={<Backup />} />
        </Routes>
      </AppLayout>
    </GoogleOAuthProvider>
  );
}

