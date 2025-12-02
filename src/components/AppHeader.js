import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderDivider,
  CHeaderNav,
  CHeaderToggler,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilBell, cilEnvelopeOpen, cilList } from '@coreui/icons'

import { AppBreadcrumb } from './index'
import { AppHeaderDropdown } from './header/index'
import { logo } from 'src/assets/brand/logo'

const AppHeader = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    // [FIX] Added 'app-header-brand' class for custom styling overlap prevention
    // [FIX] Kept position="sticky" but we will enhance it in CSS
    <CHeader position="sticky" className="mb-4 p-0 app-header-brand">
      <CContainer fluid>
        {/* Mobile Menu Toggler */}
        <CHeaderToggler
          className="ps-1"
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
        >
          <CIcon icon={cilMenu} size="lg" className="text-brand-navy" />
        </CHeaderToggler>
        
        {/* Mobile Brand Logo */}
        <CHeaderBrand className="mx-auto d-md-none" to="/">
          <CIcon icon={logo} height={48} alt="Logo" />
        </CHeaderBrand>

        {/* Desktop Header Navigation */}
        <CHeaderNav className="d-none d-md-flex me-auto">
           {/* Future Global Search or Quick Links */}
        </CHeaderNav>

        {/* Right Side Icons */}
        <CHeaderNav className="header-actions">
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilBell} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilList} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilEnvelopeOpen} size="lg" />
            </CNavLink>
          </CNavItem>
        </CHeaderNav>
        
        {/* User Profile Dropdown */}
        <CHeaderNav className="ms-3">
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
      
      {/* Breadcrumbs Divider */}
      <CHeaderDivider />
      <CContainer fluid className="pb-2">
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader