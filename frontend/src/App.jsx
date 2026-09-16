import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import InventoryForm from './pages/InventoryForm';
import Payments from './pages/Payments';
import PaymentForm from './pages/PaymentForm';
import Unauthorized from './pages/Unauthorized';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute>
              <Layout><Inventory /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/inventory/add" element={
            <ProtectedRoute allowedRoles={['creator']}>
              <Layout><InventoryForm /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/inventory/edit/:id" element={
            <ProtectedRoute allowedRoles={['creator']}>
              <Layout><InventoryForm /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/payments" element={
            <ProtectedRoute allowedRoles={['creator', 'sales']}>
              <Layout><Payments /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/payments/add" element={
            <ProtectedRoute allowedRoles={['creator', 'sales']}>
              <Layout><PaymentForm /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/payments/edit/:id" element={
            <ProtectedRoute allowedRoles={['creator']}>
              <Layout><PaymentForm /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
