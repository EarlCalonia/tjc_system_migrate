import React, { useEffect, useMemo, useState } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CForm,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormSwitch,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilSave, cilUser, cilLockLocked, cilSettings, cilBuilding } from '@coreui/icons'
import { settingsAPI, usersAPI, authAPI } from '../../utils/api'

const SettingsPage = () => {
  // --- STATE ---
  const [storeName, setStoreName] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizContact, setBizContact] = useState('')
  const [bizEmail, setBizEmail] = useState('')
  const [savingBiz, setSavingBiz] = useState(false)
  
  const [cashEnabled, setCashEnabled] = useState(true)
  const [gcashEnabled, setGcashEnabled] = useState(true)
  const [codEnabled, setCodEnabled] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [editUser, setEditUser] = useState(null)
  
  // User Form
  const [formUsername, setFormUsername] = useState('')
  const [formFirstName, setFormFirstName] = useState('')
  const [formMiddleName, setFormMiddleName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('staff')
  const [formStatus, setFormStatus] = useState('Active')
  const [formAvatarFile, setFormAvatarFile] = useState(null)
  
  // Password Reset
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  
  const isAdmin = useMemo(() => localStorage.getItem('userRole') === 'admin', [])
  const userId = localStorage.getItem('userId')

  // Modal
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })
  const showMessage = (title, message, color = 'info') => setMsgModal({ visible: true, title, message, color })

  // --- EFFECTS ---
  useEffect(() => {
    const load = async () => {
      try {
        const s = await settingsAPI.get()
        if (s.success && s.data) {
          setStoreName(s.data.store_name || '')
          setBizAddress(s.data.address || '')
          setBizContact(s.data.contact_number || '')
          setBizEmail(s.data.email || '')
          setCashEnabled(!!s.data.cash_enabled)
          setGcashEnabled(!!s.data.gcash_enabled)
          setCodEnabled(!!s.data.cod_enabled)
        }
        if (isAdmin) loadUsers()
      } catch (e) { console.error(e) }
    }
    load()
  }, [isAdmin])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await usersAPI.list()
      if (res.success) setUsers(res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoadingUsers(false) }
  }

  // --- HANDLERS ---
  const saveBusinessInfo = async () => {
    setSavingBiz(true)
    try {
      await settingsAPI.updateBusinessInfo({ store_name: storeName, address: bizAddress, contact_number: bizContact, email: bizEmail })
      showMessage('Success', 'Saved successfully', 'success')
    } catch (e) { showMessage('Error', e.message, 'danger') }
    finally { setSavingBiz(false) }
  }

  const savePreferences = async () => {
    setSavingPrefs(true)
    try {
      await settingsAPI.updatePreferences({ cash_enabled: cashEnabled, gcash_enabled: gcashEnabled, cod_enabled: codEnabled })
      showMessage('Success', 'Preferences saved', 'success')
    } catch (e) { showMessage('Error', e.message, 'danger') }
    finally { setSavingPrefs(false) }
  }

  const openAddUser = () => {
    setEditUser(null)
    setFormUsername(''); setFormFirstName(''); setFormLastName(''); setFormEmail(''); setFormPassword('')
    setShowAddUser(true)
  }
  
  const openEditUser = (u) => {
    setEditUser(u)
    setFormUsername(u.username); setFormFirstName(u.first_name); setFormLastName(u.last_name); setFormEmail(u.email)
    setFormRole(u.role); setFormStatus(u.status)
    setShowAddUser(true)
  }

  const handleUserSubmit = async () => {
    setSavingUser(true)
    try {
        const fd = new FormData()
        fd.append('username', formUsername)
        fd.append('first_name', formFirstName)
        fd.append('last_name', formLastName)
        fd.append('email', formEmail)
        fd.append('role', formRole)
        fd.append('status', formStatus)
        if (formPassword) fd.append('password', formPassword)
        if (formAvatarFile) fd.append('avatar', formAvatarFile)

        if (editUser) await usersAPI.update(editUser.id, fd)
        else await usersAPI.create(fd)

        setShowAddUser(false)
        loadUsers()
        showMessage('Success', 'User saved', 'success')
    } catch (e) { showMessage('Error', e.message, 'danger') }
    finally { setSavingUser(false) }
  }

  const savePassword = async () => {
    if (pwd.next !== pwd.confirm) return showMessage('Error', 'Passwords do not match', 'warning')
    setSavingPwd(true)
    try {
      await authAPI.changePassword(userId, pwd.current, pwd.next)
      showMessage('Success', 'Password changed', 'success')
      setPwd({ current: '', next: '', confirm: '' })
    } catch (e) { showMessage('Error', e.message, 'danger') }
    finally { setSavingPwd(false) }
  }

  // --- RENDER ---
  return (
    <CContainer fluid>
      <div className="mb-4">
        <h2>Settings</h2>
        <div className="text-medium-emphasis">Manage store and user configuration</div>
      </div>

      <CRow>
        {/* LEFT COLUMN */}
        <CCol md={6}>
          {/* BUSINESS INFO */}
          <CCard className="mb-4">
            <CCardHeader>
              <CIcon icon={cilBuilding} className="me-2" /> Business Information
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                <CCol md={12}>
                  <CFormLabel>Store Name</CFormLabel>
                  <CFormInput value={storeName} onChange={e => setStoreName(e.target.value)} />
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Address</CFormLabel>
                  <CFormInput value={bizAddress} onChange={e => setBizAddress(e.target.value)} />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Contact</CFormLabel>
                  <CFormInput value={bizContact} onChange={e => setBizContact(e.target.value)} />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Email</CFormLabel>
                  <CFormInput value={bizEmail} onChange={e => setBizEmail(e.target.value)} />
                </CCol>
                <CCol xs={12}>
                  <CButton color="primary" onClick={saveBusinessInfo} disabled={savingBiz}>
                    {savingBiz ? 'Saving...' : 'Save Changes'}
                  </CButton>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>

          {/* PREFERENCES */}
          <CCard className="mb-4">
            <CCardHeader>
              <CIcon icon={cilSettings} className="me-2" /> System Preferences
            </CCardHeader>
            <CCardBody>
              <CFormLabel className="mb-3 d-block"><strong>Payment Options</strong></CFormLabel>
              <CFormSwitch label="Enable Cash" checked={cashEnabled} onChange={e => setCashEnabled(e.target.checked)} className="mb-2" />
              <CFormSwitch label="Enable GCash" checked={gcashEnabled} onChange={e => setGcashEnabled(e.target.checked)} className="mb-2" />
              <CFormSwitch label="Enable COD" checked={codEnabled} onChange={e => setCodEnabled(e.target.checked)} className="mb-3" />
              <CButton color="primary" onClick={savePreferences} disabled={savingPrefs}>Save Preferences</CButton>
            </CCardBody>
          </CCard>
        </CCol>

        {/* RIGHT COLUMN */}
        <CCol md={6}>
          {/* USERS */}
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div><CIcon icon={cilUser} className="me-2" /> Users</div>
              {isAdmin && <CButton size="sm" color="success" variant="outline" onClick={openAddUser}><CIcon icon={cilPlus} /></CButton>}
            </CCardHeader>
            <CCardBody>
               <CTable hover responsive small>
                 <CTableHead><CTableRow><CTableHeaderCell>User</CTableHeaderCell><CTableHeaderCell>Role</CTableHeaderCell><CTableHeaderCell>Status</CTableHeaderCell><CTableHeaderCell></CTableHeaderCell></CTableRow></CTableHead>
                 <CTableBody>
                   {loadingUsers ? <CTableRow><CTableDataCell colSpan="4">Loading...</CTableDataCell></CTableRow> : 
                    users.map(u => (
                      <CTableRow key={u.id}>
                        <CTableDataCell>{u.username}</CTableDataCell>
                        <CTableDataCell>{u.role}</CTableDataCell>
                        <CTableDataCell><CBadge color={u.status === 'Active' ? 'success' : 'secondary'}>{u.status}</CBadge></CTableDataCell>
                        <CTableDataCell className="text-end"><CButton size="sm" color="info" variant="ghost" onClick={() => openEditUser(u)}><CIcon icon={cilPencil} /></CButton></CTableDataCell>
                      </CTableRow>
                    ))}
                 </CTableBody>
               </CTable>
            </CCardBody>
          </CCard>

          {/* PASSWORD */}
          <CCard className="mb-4">
            <CCardHeader>
              <CIcon icon={cilLockLocked} className="me-2" /> Change Password
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                <CCol xs={12}>
                  <CFormInput type="password" placeholder="Current Password" value={pwd.current} onChange={e => setPwd({...pwd, current: e.target.value})} />
                </CCol>
                <CCol xs={12}>
                  <CFormInput type="password" placeholder="New Password" value={pwd.next} onChange={e => setPwd({...pwd, next: e.target.value})} />
                </CCol>
                <CCol xs={12}>
                  <CFormInput type="password" placeholder="Confirm Password" value={pwd.confirm} onChange={e => setPwd({...pwd, confirm: e.target.value})} />
                </CCol>
                <CCol xs={12}>
                   <CButton color="danger" variant="outline" onClick={savePassword} disabled={savingPwd}>Update Password</CButton>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* USER MODAL */}
      <CModal visible={showAddUser} onClose={() => setShowAddUser(false)}>
        <CModalHeader><CModalTitle>{editUser ? 'Edit User' : 'Add User'}</CModalTitle></CModalHeader>
        <CModalBody>
          <CRow className="g-3">
             <CCol md={6}><CFormLabel>First Name</CFormLabel><CFormInput value={formFirstName} onChange={e => setFormFirstName(e.target.value)} /></CCol>
             <CCol md={6}><CFormLabel>Last Name</CFormLabel><CFormInput value={formLastName} onChange={e => setFormLastName(e.target.value)} /></CCol>
             <CCol md={12}><CFormLabel>Username</CFormLabel><CFormInput value={formUsername} onChange={e => setFormUsername(e.target.value)} /></CCol>
             <CCol md={12}><CFormLabel>Email</CFormLabel><CFormInput type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} /></CCol>
             <CCol md={12}><CFormLabel>Password {editUser && '(Leave blank to keep)'}</CFormLabel><CFormInput type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} /></CCol>
             <CCol md={6}><CFormLabel>Role</CFormLabel><CFormSelect value={formRole} onChange={e => setFormRole(e.target.value)}><option value="staff">Staff</option><option value="admin">Admin</option><option value="driver">Driver</option></CFormSelect></CCol>
             <CCol md={6}><CFormLabel>Status</CFormLabel><CFormSelect value={formStatus} onChange={e => setFormStatus(e.target.value)}><option>Active</option><option>Inactive</option></CFormSelect></CCol>
             <CCol md={12}><CFormLabel>Avatar</CFormLabel><CFormInput type="file" onChange={e => setFormAvatarFile(e.target.files[0])} /></CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddUser(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleUserSubmit} disabled={savingUser}>Save</CButton>
        </CModalFooter>
      </CModal>
      
      {/* MESSAGE MODAL */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SettingsPage