import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CRow, CCol, CWidgetStatsF } from '@coreui/react'; // Reverted to CWidgetStatsF
import CIcon from '@coreui/icons-react';
// Removed CChartLine import as it's no longer used here
import { 
  cilMoney, 
  cilChartLine, 
  cilList, // Used for Inventory Action Required
  cilClock,
  cilArrowTop,
  cilArrowRight
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
    // Margin reduced to mb-3 for tighter vertical spacing
    <CRow className="g-4 mb-3"> 
      
      {/* 1. Today's Sales (Reverted to Icon-on-Top) */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm border-0 h-100"
          color="success"
          // Restored icon prop for CWidgetStatsF
          icon={<CIcon icon={cilMoney} height={24} />} 
          padding={false}
          title="Today's Sales"
          value={loading ? 'Loading...' : formatPeso(stats.todaySales)}
          footer={
            <div className="d-flex justify-content-between align-items-center text-medium-emphasis small px-1">
               <span>Daily Revenue</span>
               <span className="text-success fw-semibold">
                 <CIcon icon={cilArrowTop} size="sm" /> +12%
               </span>
            </div>
          }
        />
      </CCol>

      {/* 2. Sales This Week (Reverted to Icon-on-Top) */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm border-0 h-100"
          color="primary"
          // Restored icon prop for CWidgetStatsF
          icon={<CIcon icon={cilChartLine} height={24} />} 
          padding={false}
          title="Sales This Week"
          value={loading ? '...' : formatPeso(stats.weekSales)}
          footer={
            // Kept click-to-drill functionality
            <Link to="/reports" className="text-decoration-none w-100">
              <div className="d-flex justify-content-between align-items-center text-primary small cursor-pointer hover-overlay px-1">
                <span className="text-medium-emphasis">7 Day Performance</span>
                <span className="fw-bold d-flex align-items-center">
                  View Report <CIcon icon={cilArrowRight} size="sm" className="ms-1"/>
                </span>
              </div>
            </Link>
          }
        />
      </CCol>

      {/* 3. Inventory Action Required (Reverted to Icon-on-Top - Combined Metric) */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm border-0 h-100"
          color="danger" 
          // Restored icon prop for CWidgetStatsF
          icon={<CIcon icon={cilList} height={24} />} 
          padding={false}
          title="Inventory Action Required" 
          value={loading ? '...' : stats.lowStockItems.toString()}
          footer={
            // Kept click-to-drill functionality
            <Link to="/inventory" className="text-decoration-none w-100">
              <div className="d-flex justify-content-between align-items-center text-danger small cursor-pointer hover-overlay px-1">
                <span className="text-medium-emphasis">Total Critical Items</span>
                <span className="fw-bold d-flex align-items-center">
                  View Alerts <CIcon icon={cilArrowRight} size="sm" className="ms-1"/>
                </span>
              </div>
            </Link>
          }
        />
      </CCol>

      {/* 4. Pending Orders (Reverted to Icon-on-Top) */}
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="shadow-sm border-0 h-100"
          color="warning"
          // Restored icon prop for CWidgetStatsF
          icon={<CIcon icon={cilClock} height={24} />} 
          padding={false}
          title="Pending Orders"
          value={loading ? '...' : stats.pendingOrders.toString()}
          footer={
            // Kept click-to-drill functionality
            <Link to="/orders" className="text-decoration-none w-100">
              <div className="d-flex justify-content-between align-items-center text-warning small cursor-pointer hover-overlay px-1">
                <span className="text-medium-emphasis">Awaiting Processing</span>
                <span className="fw-bold d-flex align-items-center">
                  Action <CIcon icon={cilArrowRight} size="sm" className="ms-1"/>
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