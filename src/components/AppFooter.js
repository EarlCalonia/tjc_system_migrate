import React from 'react'
import { CFooter } from '@coreui/react'
import { cilSpeedometer, cilSettings } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

const AppFooter = () => {
  return (
    <CFooter className="admin-footer d-flex flex-column flex-md-row align-items-center justify-content-between px-4 py-3">
      {/* Left: Copyright & Company */}
      <div className="d-flex align-items-center mb-2 mb-md-0">
        <a href="https://coreui.io" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          <span className="fw-bold text-brand-navy" style={{fontFamily: 'Oswald, sans-serif', letterSpacing: '0.5px'}}>
            TJC AUTO SUPPLY
          </span>
        </a>
        <span className="mx-2 text-muted">|</span>
        <span className="small text-muted">
          &copy; {new Date().getFullYear()} Management Portal
        </span>
      </div>

      {/* Right: Version & Links */}
      <div className="d-flex align-items-center gap-3 small">
        <div className="d-none d-sm-flex align-items-center text-muted">
          <CIcon icon={cilSpeedometer} size="sm" className="me-1"/>
          <span>v1.0.0 (Stable)</span>
        </div>
        <div className="vr d-none d-sm-block"></div>
        <div className="text-muted">
           Powered by <span className="fw-semibold text-brand-blue">TJC-SIMS</span>
        </div>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)