import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CSidebar, CSidebarBrand, CSidebarToggler } from '@coreui/react'
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
        {/* --- FULL LOGO --- */}
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
        
        {/* --- NARROW LOGO --- */}
        <img 
          className="sidebar-brand-narrow" 
          src={sidebarIcon} 
          alt="Icon" 
          style={{ height: '35px', objectFit: 'contain' }} 
        />
      </CSidebarBrand>
      
      {/* Navigation - Will grow to fill space and scroll if needed */}
      <AppSidebarNav items={navigation} />

      {/* Footer Toggler */}
      <CSidebarToggler
        className="d-none d-lg-flex"
        onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
      />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)