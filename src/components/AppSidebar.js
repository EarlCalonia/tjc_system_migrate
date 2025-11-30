import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CSidebar, CSidebarBrand, CSidebarNav } from '@coreui/react'
// import SimpleBar from 'simplebar-react' // REMOVED
import { AppSidebarNav } from './AppSidebarNav'
import navigation from '../_nav'

// Branding Assets
import sidebarIcon from '../assets/sidebar-icon.png' 

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
      className="sidebar-brand-navy border-end" 
    >
      <CSidebarBrand className="d-none d-md-flex flex-column align-items-center justify-content-center" to="/">
        
        {/* --- FULL SIDEBAR VIEW (Expanded) --- */}
        <div className="d-flex flex-column align-items-center py-4 sidebar-brand-full">
            <img 
                src={sidebarIcon} 
                alt="TJC Logo" 
                className="mb-3" 
                style={{
                  height: '55px', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' 
                }} 
            />
            
            <div style={{
                fontFamily: "'Oswald', sans-serif", 
                color: '#f1ce44', 
                fontSize: '15px', 
                letterSpacing: '1.5px',
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)' 
            }}>
                TJC AUTO SUPPLY
            </div>
            <div style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '10px',
                letterSpacing: '1px',
                marginTop: '2px',
                textTransform: 'uppercase'
            }}>
                Admin Portal
            </div>
        </div>
        
        {/* --- MINIMIZED SIDEBAR VIEW (Collapsed) --- */}
        <img 
          className="sidebar-brand-narrow" 
          src={sidebarIcon} 
          alt="Icon" 
          style={{ height: '35px', objectFit: 'contain' }} 
        />
      </CSidebarBrand>
      
      <CSidebarNav className="no-scroll-fix">
        {/* [FIX] Directly rendering navigation links now that SimpleBar is removed */}
        <AppSidebarNav items={navigation} />
      </CSidebarNav>
      
    </CSidebar>
  )
}

export default React.memo(AppSidebar)