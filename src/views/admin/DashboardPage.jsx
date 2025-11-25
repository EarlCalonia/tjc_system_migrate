import React from 'react';
// Navbar import removed
import DashboardStats from '../../components/admin/DashboardStats';
import DashboardSections from '../../components/admin/DashboardSections';

const DashboardPage = () => {
  return (
    // Removed .admin-layout and .admin-main wrappers
    <div className="admin-container">
      <div className="page-header mb-4">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Welcome Back! Here's what's happening with your store today.</p>
      </div>
      
      <DashboardStats />
      <DashboardSections />
    </div>
  );
};

export default DashboardPage;