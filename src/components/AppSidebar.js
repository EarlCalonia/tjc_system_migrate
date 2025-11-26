import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom';
import { 
  CSidebar, CSidebarBrand, CSidebarNav, CSidebarToggler,
  CSidebarFooter, CAvatar 
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilAccountLogout, cilArrowRight
} from '@coreui/icons'

import tcjLogo from '../assets/tcj_logo.png'; 

import { AppSidebarNav } from './AppSidebarNav'
import { sygnet } from 'src/assets/brand/sygnet'
import SimpleBar from 'simplebar-react'
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    <CSidebar
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
      className="sidebar-light border-end bg-white" 
    >
      {/* --- 1. CENTERED LOGO AND TIGHTENED SPACING --- */}
      <CSidebarBrand 
        className="d-none d-md-flex justify-content-center py-2" // py-2 provides minimal vertical spacing
        to="/" 
        // Horizontal space is now maximized by removing the inline padding style
      >
        <img 
            src={tcjLogo} 
            alt="TJC Auto Supply Logo" 
            className="sidebar-brand-full" 
            // Height increased, and internal padding removed for max size
            style={{height: '45px', objectFit: 'contain'}} 
        />
        <CIcon className="sidebar-brand-narrow" icon={sygnet} height={35} />
      </CSidebarBrand>
      
      <CSidebarNav>
        {/* --- PROFILE AVATAR (Unchanged) --- */}
        <Link to="/settings" className="d-flex align-items-center p-3 text-decoration-none border-bottom text-dark sidebar-profile-link">
            <CAvatar 
                src="/src/assets/images/avatars/1.jpg"
                size="md" 
                color="primary" 
                status="success" 
                className="me-3"
            />
            <div className="d-flex flex-column text-start">
                <div className="fw-bold">John Doe</div>
                <div className="small text-muted">Administrator</div>
            </div>
        </Link>
        {/* --- END PROFILE --- */}
        
        <SimpleBar>
          <AppSidebarNav items={navigation} />
        </SimpleBar>
      </CSidebarNav>
      
      {/* --- MINIMAL FOOTER: Logout Only --- */}
      <CSidebarFooter className="border-top p-2">
         <Link to="/admin/login" className="d-flex align-items-center text-dark text-decoration-none py-1 px-2 small sidebar-footer-link">
             <CIcon icon={cilAccountLogout} className="me-2 text-danger" /> 
             Logout 
             <CIcon icon={cilArrowRight} size="sm" className="ms-auto text-muted" />
         </Link>
      </CSidebarFooter>

      <CSidebarToggler
        className="d-none d-lg-flex"
        onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
      />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)