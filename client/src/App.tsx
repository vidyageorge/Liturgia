import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Changelog from './pages/Changelog';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Masses from './pages/Masses';
import Members from './pages/Members';
import Schedule from './pages/Schedule';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/masses" element={<Masses />} />
          <Route path="/members" element={<Members />} />
          <Route path="/community" element={<Community />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
