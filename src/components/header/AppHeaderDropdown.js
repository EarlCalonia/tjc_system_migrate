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
  cilCreditCard,
  cilCommentSquare,
  cilEnvelopeOpen,
  cilFile,
  cilLockLocked,
  cilSettings,
  cilTask,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { authAPI } from '../../utils/api'

const ASSET_URL = 'http://localhost:5000'

const AppHeaderDropdown = () => {
  const [avatar, setAvatar] = useState(null)

  // Load Avatar on Mount & Listen for Updates
  useEffect(() => {
    const loadAvatar = () => {
       const stored = localStorage.getItem('userAvatar')
       if (stored) {
           // Handle both full URLs and relative paths
           setAvatar(stored.startsWith('http') ? stored : `${ASSET_URL}${stored}`)
       }
    }
    
    loadAvatar()

    // Listen for the custom event dispatched from SettingsPage
    window.addEventListener('userUpdated', loadAvatar)
    return () => window.removeEventListener('userUpdated', loadAvatar)
  }, [])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      localStorage.clear()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed', error)
    }
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0" caret={false}>
        {/* Display updated avatar or default */}
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