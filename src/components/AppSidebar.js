import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CSidebar, CSidebarBrand, CSidebarNav, CSidebarToggler } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { sygnet } from 'src/assets/brand/sygnet'
import SimpleBar from 'simplebar-react'
import { AppSidebarNav } from './AppSidebarNav'
import navigation from '../_nav'
import tcjLogo from '../assets/tcj_logo.png'; 

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
      <CSidebarBrand className="d-none d-md-flex justify-content-center py-3" to="/">
        <img 
            src={tcjLogo} 
            alt="TJC Logo" 
            className="sidebar-brand-full" 
            style={{height: '45px', objectFit: 'contain'}} 
        />
        <CIcon className="sidebar-brand-narrow" icon={sygnet} height={35} />
      </CSidebarBrand>
      
      <CSidebarNav>
        <SimpleBar>
          <AppSidebarNav items={navigation} />
        </SimpleBar>
      </CSidebarNav>
      
      {/* Footer Removed - Logout moved to Header Dropdown */}
      
      <CSidebarToggler
        className="d-none d-lg-flex"
        onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
      />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)