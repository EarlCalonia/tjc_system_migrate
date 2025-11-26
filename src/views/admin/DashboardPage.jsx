import React from 'react'
import { CContainer } from '@coreui/react'
import DashboardStats from '../../components/admin/DashboardStats'
import DashboardSections from '../../components/admin/DashboardSections'

const DashboardPage = () => {
  return (
    <CContainer fluid>
      <div className="mb-4">
        <h1 className="h2">Dashboard Overview</h1>
        <p className="text-medium-emphasis">
          Welcome Back! Here's what's happening with your store today.
        </p>
      </div>

      {/* NOTE: DashboardStats and DashboardSections should ideally also be refactored
        to use <CRow>, <CCol>, and <CWidgetStatsF> components internally 
        for consistent spacing and responsive behavior. 
      */}
      <DashboardStats />
      <DashboardSections />
    </CContainer>
  )
}

export default DashboardPage