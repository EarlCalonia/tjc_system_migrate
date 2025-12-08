import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CRow, CCol, CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilMoney, 
  cilChartLine, 
  cilList, 
  cilClock,
  cilArrowRight,
  cilWarning
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

  // --- REUSABLE COLORED CARD COMPONENT ---
  const StatCard = ({ title, value, icon, gradient, textColor = 'text-white', footerLabel, footerLink, footerColor }) => (
    <CCard 
      className={`h-100 border-0 shadow-sm overflow-hidden`}
      style={{ 
        background: gradient,
        transition: 'transform 0.2s ease-in-out',
        cursor: 'default'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <CCardBody className="p-4 position-relative d-flex flex-column justify-content-between">
        
        {/* Background Watermark Icon */}
        <div className="position-absolute" style={{ top: '-10px', right: '-15px', opacity: 0.15, transform: 'rotate(15deg)' }}>
           {React.cloneElement(icon, { height: 120, width: 120, className: textColor })}
        </div>

        {/* Content */}
        <div className="position-relative z-1">
          <div className={`text-uppercase fw-bold small mb-2 ${textColor}`} style={{ opacity: 0.8, letterSpacing: '1px' }}>
            {title}
          </div>
          <div className={`fw-bold ${textColor}`} style={{ fontSize: '2rem', fontFamily: 'Oswald, sans-serif' }}>
            {value}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 position-relative z-1" style={{ borderTop: `1px solid ${textColor === 'text-white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` }}>
          {footerLink ? (
            <Link to={footerLink} className="text-decoration-none">
              <div className={`d-flex align-items-center small fw-bold text-uppercase ${footerColor || textColor}`}>
                {footerLabel} <CIcon icon={cilArrowRight} size="sm" className="ms-1" />
              </div>
            </Link>
          ) : (
            <div className={`d-flex align-items-center small fw-bold text-uppercase ${textColor}`} style={{ opacity: 0.9 }}>
              {footerLabel}
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  );

  return (
    <CRow className="g-4 mb-4"> 
      
      {/* 1. Today's Revenue (Brand Green Gradient) */}
      <CCol sm={6} lg={3}>
        <StatCard 
          title="Today's Revenue"
          value={loading ? '-' : formatPeso(stats.todaySales)}
          icon={<CIcon icon={cilMoney} />}
          gradient="linear-gradient(135deg, #2eb85c 0%, #1b9e3e 100%)" // Success Gradient
          footerLabel="View Daily Sales"
          footerLink="/sales"
        />
      </CCol>

      {/* 2. Weekly Revenue (Brand Navy Gradient) */}
      <CCol sm={6} lg={3}>
        <StatCard 
          title="Weekly Revenue"
          value={loading ? '-' : formatPeso(stats.weekSales)}
          icon={<CIcon icon={cilChartLine} />}
          gradient="linear-gradient(135deg, #17334e 0%, #0f2438 100%)" // Brand Navy Gradient
          footerLabel="View Performance"
          footerLink="/reports"
          footerColor="text-brand-yellow" // Yellow accent on Navy
        />
      </CCol>

      {/* 3. Critical Inventory (Brand Red Gradient) */}
      <CCol sm={6} lg={3}>
        <StatCard 
          title="Critical Alerts" 
          value={loading ? '-' : stats.lowStockItems.toString()}
          icon={<CIcon icon={cilWarning} />}
          gradient="linear-gradient(135deg, #e55353 0%, #b21f2d 100%)" // Danger Gradient
          footerLabel="Restock Inventory"
          footerLink="/inventory"
        />
      </CCol>

      {/* 4. Pending Orders (Brand Yellow Gradient - Dark Text) */}
      <CCol sm={6} lg={3}>
        <StatCard 
          title="Pending Orders"
          value={loading ? '-' : stats.pendingOrders.toString()}
          icon={<CIcon icon={cilClock} />}
          gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" // Warning Gradient
          textColor="text-brand-navy" // Navy text for contrast on yellow
          footerLabel="Process Queue"
          footerLink="/orders"
        />
      </CCol>

    </CRow>
  );
};

export default DashboardStats;