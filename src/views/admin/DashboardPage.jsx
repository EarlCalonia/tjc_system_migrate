import React from 'react';
import DashboardStats from '../../components/admin/DashboardStats';
import DashboardSections from '../../components/admin/DashboardSections';

const DashboardPage = () => {
  return (
    // FINAL FIX: Removed the 'px-3' padding utility to achieve edge-to-edge layout.
    <div className="admin-container"> 
      <div className="page-header"> 
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Welcome Back! Here's what's happening with your store today.</p>
      </div>
      
      <DashboardStats />
      <DashboardSections />
    </div>
  );
};

export default DashboardPage;