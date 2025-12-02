import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CHeaderToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu } from '@coreui/icons'

import { AppHeaderDropdown } from './header/index'
import { logo } from 'src/assets/brand/logo'
// DO NOT IMPORT Navbar.css HERE

const AppHeader = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  
  // User Info
  const username = localStorage.getItem('username') || 'Administrator'
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })

  return (
    <CHeader position="sticky" className="mb-4 p-0 app-header-brand border-0">
      <CContainer fluid>
        
        {/* LEFT: Toggler & Brand */}
        <div className="d-flex align-items-center">
          <CHeaderToggler
            className="ps-1 border-0 header-toggler-brand"
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          >
            <CIcon icon={cilMenu} size="lg" />
          </CHeaderToggler>
          
          <CHeaderBrand className="mx-auto d-md-none" to="/">
            <CIcon icon={logo} height={48} alt="Logo" />
          </CHeaderBrand>
        </div>

        {/* CENTER: Welcome Context */}
        <div className="d-none d-md-flex flex-column ms-3 header-context">
           <span className="welcome-text">
             Welcome back, <span className="text-brand-blue">{username}</span>
           </span>
           <span className="date-text">
             {today}
           </span>
        </div>

        {/* RIGHT: User Profile */}
        <CHeaderNav className="ms-auto">
          <AppHeaderDropdown />
        </CHeaderNav>

      </CContainer>
    </CHeader>
  )
}

export default AppHeader