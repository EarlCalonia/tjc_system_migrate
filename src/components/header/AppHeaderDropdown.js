import React, { useEffect, useState } from 'react'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilBell,
  cilLockLocked,
  cilSettings,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { authAPI } from '../../utils/api'

const ASSET_URL = 'http://localhost:5000'

const AppHeaderDropdown = () => {
  const [avatar, setAvatar] = useState(null)

  useEffect(() => {
    const loadAvatar = () => {
       const stored = localStorage.getItem('userAvatar')
       if (stored) {
           setAvatar(stored.startsWith('http') ? stored : `${ASSET_URL}${stored}`)
       }
    }
    loadAvatar()
    window.addEventListener('userUpdated', loadAvatar)
    return () => window.removeEventListener('userUpdated', loadAvatar)
  }, [])

  // [FIXED] Robust Logout Handler
  const handleLogout = async () => {
    try {
      // Attempt to tell server to logout (clear cookies if any)
      await authAPI.logout()
    } catch (error) {
      console.error('Logout API failed', error)
    } finally {
      // [CRITICAL] Always run this, regardless of API success/failure
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0" caret={false}>
        <CAvatar src={avatar || undefined} color={!avatar ? "secondary" : undefined} size="md" status="success">
           {!avatar && <CIcon icon={cilUser} />}
        </CAvatar>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-light fw-semibold py-2">Account</CDropdownHeader>
        <CDropdownItem href="#">
          <CIcon icon={cilBell} className="me-2" />
          Updates
          <CBadge color="info" className="ms-2">42</CBadge>
        </CDropdownItem>
        <CDropdownHeader className="bg-light fw-semibold py-2">Settings</CDropdownHeader>
        <CDropdownItem href="#/settings">
          <CIcon icon={cilSettings} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem onClick={handleLogout} style={{cursor:'pointer'}}>
          <CIcon icon={cilLockLocked} className="me-2" />
          Lock Account
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown