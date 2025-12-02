import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { CContainer } from '@coreui/react'

const DefaultLayout = () => {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100 bg-light">
        {/* --- 1. INSERT HEADER HERE --- */}
        <AppHeader />
        
        <div className="body flex-grow-1 px-3">
          {/* [FIX] Changed to 'fluid' to occupy 100% width instead of fixed 1320px */}
          <CContainer fluid>
            <AppContent />
          </CContainer>
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout