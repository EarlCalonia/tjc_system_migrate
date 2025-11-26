import React from 'react'
import { AppContent, AppSidebar, AppFooter } from '../components/index' 
import { CContainer } from '@coreui/react'

const DefaultLayout = () => {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100 bg-light">
        {/* Horizontal padding set to ZERO (px-0), vertical padding added (py-3) */}
        <div className="body flex-grow-1 px-0 py-3"> 
          {/* Ensure the container is fluid (full width) with no inherited padding */}
          <CContainer fluid className="p-0"> 
            <AppContent />
          </CContainer>
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout