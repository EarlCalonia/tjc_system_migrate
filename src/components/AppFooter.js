import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="border-top-0 bg-transparent">
      <div>
        <span className="fw-bold me-1 text-brand-navy">TJC AUTO SUPPLY</span>
        <span className="text-secondary">&copy; {new Date().getFullYear()} Admin Portal.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1 text-secondary">System Version</span>
        <span className="fw-semibold text-brand-navy">1.0.0</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)