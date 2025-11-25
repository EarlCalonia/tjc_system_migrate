import React, { useState, useEffect } from 'react';
import { CRow, CCol, CWidgetStatsF } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilMoney, 
  cilChartLine, 
  cilWarning, 
  cilClock,
  cilArrowTop,
  cilArrowBottom
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
    `₱ ${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <CRow className="mb-4">
      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="mb-3 shadow-sm" // Added shadow
          color="success"
          icon={<CIcon icon={cilMoney} height={24} />}
          padding={false}
          title="Today's Sales"
          value={loading ? 'Loading...' : formatPeso(stats.todaySales)}
          footer={
            <div className="text-medium-emphasis text-end" style={{fontSize: '0.85rem'}}>
               Latest Updates <CIcon icon={cilArrowTop} size="sm"/>
            </div>
          }
        />
      </CCol>

      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="mb-3 shadow-sm"
          color="primary"
          icon={<CIcon icon={cilChartLine} height={24} />}
          padding={false}
          title="Sales This Week"
          value={loading ? 'Loading...' : formatPeso(stats.weekSales)}
          footer={
            <div className="text-medium-emphasis text-end" style={{fontSize: '0.85rem'}}>
              7 Day Performance <CIcon icon={cilArrowTop} size="sm"/>
            </div>
          }
        />
      </CCol>

      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="mb-3 shadow-sm"
          color="danger"
          icon={<CIcon icon={cilWarning} height={24} />}
          padding={false}
          title="Low Stock Items"
          value={loading ? '...' : stats.lowStockItems.toString()}
          footer={
             <div className="text-medium-emphasis text-end" style={{fontSize: '0.85rem'}}>
              Needs Attention <CIcon icon={cilArrowTop} size="sm"/>
            </div>
          }
        />
      </CCol>

      <CCol sm={6} lg={3}>
        <CWidgetStatsF
          className="mb-3 shadow-sm"
          color="warning"
          icon={<CIcon icon={cilClock} height={24} />}
          padding={false}
          title="Pending Orders"
          value={loading ? '...' : stats.pendingOrders.toString()}
          footer={
            <div className="text-medium-emphasis text-end" style={{fontSize: '0.85rem'}}>
              Awaiting Processing
            </div>
          }
        />
      </CCol>
    </CRow>
  );
};

export default DashboardStats;