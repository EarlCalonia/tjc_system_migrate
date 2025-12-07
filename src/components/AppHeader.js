import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu } from '@coreui/icons'
import { logo } from 'src/assets/brand/logo'

const AppHeader = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    // [CRITICAL UPDATE] 'd-md-none' hides this entire header on Desktop
    // It will ONLY appear on mobile devices to let you open the sidebar
    <CHeader position="sticky" className="mb-4 d-md-none border-0 shadow-sm">
      <CContainer fluid>
        <CHeaderToggler
          className="ps-1"
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        
        <CHeaderBrand className="mx-auto" to="/">
          <CIcon icon={logo} height={48} alt="Logo" />
        </CHeaderBrand>
      </CContainer>
    </CHeader>
  )
}

export default AppHeader