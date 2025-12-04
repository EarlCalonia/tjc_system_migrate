import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CRow, CCol, CWidgetStatsF } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilMoney, 
  cilChartLine, 
  cilList, 
  cilClock,
  cilArrowRight,
  cilArrowTop
} from '@coreui/icons';
import { dashboardAPI } from '../../utils/api';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    weekSales: 0,
    lowStockItems: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const result = await dashboardAPI.getDashboardStats();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const formatPeso = (amount) => 
    `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <CRow className="g-4 mb-4"> 
      {/* 1. Today's Sales */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm h-100 border-start border-start-4 border-start-success"
          color="white"
          icon={<CIcon icon={cilMoney} height={24} className="text-success"/>}
          padding={false}
          title="Today's Revenue"
          value={loading ? '-' : formatPeso(stats.todaySales)}
          footer={
            <div className="d-flex justify-content-between align-items-center text-medium-emphasis small px-1">
               <span>Daily Sales</span>
               <span className="text-success fw-bold">
                 <CIcon icon={cilArrowTop} size="sm" /> Live
               </span>
            </div>
          }
        />
      </CCol>

      {/* 2. Weekly Sales */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm h-100 border-start border-start-4 border-start-primary"
          color="white"
          icon={<CIcon icon={cilChartLine} height={24} className="text-primary"/>}
          padding={false}
          title="Weekly Revenue"
          value={loading ? '-' : formatPeso(stats.weekSales)}
          footer={
            <Link to="/reports" className="text-decoration-none w-100">
              <div className="d-flex justify-content-between align-items-center text-primary small cursor-pointer hover-overlay px-1">
                <span className="text-medium-emphasis">7 Day Performance</span>
                <span className="fw-bold d-flex align-items-center">
                  Reports <CIcon icon={cilArrowRight} size="sm" className="ms-1"/>
                </span>
              </div>
            </Link>
          }
        />
      </CCol>

      {/* 3. Inventory Alerts */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm h-100 border-start border-start-4 border-start-danger"
          color="white"
          icon={<CIcon icon={cilList} height={24} className="text-danger"/>}
          padding={false}
          title="Critical Inventory" 
          value={loading ? '-' : stats.lowStockItems.toString()}
          footer={
            <Link to="/inventory" className="text-decoration-none w-100">
              <div className="d-flex justify-content-between align-items-center text-danger small cursor-pointer hover-overlay px-1">
                <span className="text-medium-emphasis">Low Stock / OOS</span>
                <span className="fw-bold d-flex align-items-center">
                  Restock <CIcon icon={cilArrowRight} size="sm" className="ms-1"/>
                </span>
              </div>
            </Link>
          }
        />
      </CCol>

      {/* 4. Pending Orders */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm h-100 border-start border-start-4 border-start-warning"
          color="white"
          icon={<CIcon icon={cilClock} height={24} className="text-warning"/>}
          padding={false}
          title="Pending Orders"
          value={loading ? '-' : stats.pendingOrders.toString()}
          footer={
            <Link to="/orders" className="text-decoration-none w-100">
              <div className="d-flex justify-content-between align-items-center text-warning small cursor-pointer hover-overlay px-1">
                <span className="text-medium-emphasis">Needs Processing</span>
                <span className="fw-bold d-flex align-items-center">
                  Process <CIcon icon={cilArrowRight} size="sm" className="ms-1"/>
                </span>
              </div>
            </Link>
          }
        />
      </CCol>
    </CRow>
  );
};

export default DashboardStats;