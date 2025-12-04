import React from 'react'
import { CContainer } from '@coreui/react'
import DashboardStats from '../../components/admin/DashboardStats'
import DashboardSections from '../../components/admin/DashboardSections'

const DashboardPage = () => {
  return (
    <CContainer fluid className="px-4 py-4">
      <div className="mb-4">
        <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald, sans-serif', letterSpacing: '1px'}}>COMMAND DASHBOARD</h2>
        <div className="text-medium-emphasis fw-semibold">Real-time operational overview</div>
      </div>

      <DashboardStats />
      <DashboardSections />
    </CContainer>
  )
}

export default DashboardPage