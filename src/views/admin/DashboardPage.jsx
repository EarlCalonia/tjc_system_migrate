import React from 'react'
import { CContainer } from '@coreui/react'
import DashboardStats from '../../components/admin/DashboardStats'
import DashboardSections from '../../components/admin/DashboardSections'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer } from '@coreui/icons'

const DashboardPage = () => {
  // --- MODERNIZATION: CSS Keyframes for Staggered Entrance ---
  const animationStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in-up {
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; /* "Ease Out Quart" feel */
      opacity: 0; /* Start hidden */
    }
    .delay-100 { animation-delay: 0.1s; }
    .delay-200 { animation-delay: 0.2s; }
    .delay-300 { animation-delay: 0.3s; }
  `;

  return (
    <CContainer fluid className="px-4 py-4">
      <style>{animationStyles}</style>

      {/* 1. Header (Enters First) */}
      <div className="d-flex justify-content-between align-items-end mb-4 fade-in-up delay-100">
        <div>
          <div className="text-medium-emphasis fw-bold small text-uppercase mb-1" style={{ letterSpacing: '2px' }}>
            Overview
          </div>
          <h2 className="fw-bold text-brand-navy mb-0" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '1px' }}>
            COMMAND DASHBOARD
          </h2>
        </div>
        <div className="d-none d-md-flex align-items-center text-medium-emphasis small">
          <CIcon icon={cilSpeedometer} className="me-2 text-brand-yellow" />
          Real-time operational metrics
        </div>
      </div>

      {/* 2. Stat Cards (Enters Second) */}
      <div className="fade-in-up delay-200">
        <DashboardStats />
      </div>

      {/* 3. Charts & Tables (Enters Last) */}
      <div className="fade-in-up delay-300">
        <DashboardSections />
      </div>
    </CContainer>
  )
}

export default DashboardPage