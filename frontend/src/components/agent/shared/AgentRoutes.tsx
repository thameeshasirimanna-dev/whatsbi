import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AgentLayout from './AgentLayout';
import AgentDashboard from '../dashboard/AgentDashboard';
import ConversationsPage from '../conversations/ConversationsPage';
import CustomersPage from '../customers/CustomersPage';
import OrdersPage from '../orders/OrdersPage';
import OrderDetailsPage from '../orders/OrderDetailsPage';
import InvoicesPage from '../invoices/InvoicesPage';
import TemplatesPage from '../templates/TemplatesPage';
import InventoryPage from '../inventory/InventoryPage';
import AppointmentsPage from '../appointments/AppointmentsPage';
import AnalyticsPage from "../analytics/AnalyticsPage";
import SettingsPage from '../settings/SettingsPage';
import ServicesPage from '../services/ServicesPage';

const AgentRoutes: React.FC = () => {
  
  return (
    <Routes>
      {/* Agent Dashboard Routes - All wrapped with layout including sidebar */}
      <Route path="/" element={<AgentLayout />}>
        <Route index element={<AgentDashboard />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};

export default AgentRoutes;