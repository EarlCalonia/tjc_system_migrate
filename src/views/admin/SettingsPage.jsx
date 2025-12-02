import React, { useEffect, useMemo, useState } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
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
  CNav,
  CNavItem,
  CNavLink,
  CSpinner,
  CTooltip
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilPlus, cilPencil, cilLockLocked, cilSettings, cilBuilding,
  cilSave, cilCreditCard, cilSearch, cilPeople, cilMoney, cilWarning
} from '@coreui/icons'
import { settingsAPI, usersAPI, authAPI } from '../../utils/api'

// [FIX] Import Global Brand Styles
import '../../styles/App.css'
import '../../styles/Admin.css'
import '../../styles/SettingsPage.css'

const SettingsPage = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('general')
  const [initLoading, setInitLoading] = useState(true)
  
  // Business & Prefs
  const [storeName, setStoreName] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizContact, setBizContact] = useState('')
  const [bizEmail, setBizEmail] = useState('')
  const [cashEnabled, setCashEnabled] = useState(true)
  const [gcashEnabled, setGcashEnabled] = useState(true)
  const [codEnabled, setCodEnabled] = useState(true)
  const [savingBiz, setSavingBiz] = useState(false)
  
  // Users
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [editUser, setEditUser] = useState(null)
  
  // User Form State
  const [formUsername, setFormUsername] = useState('')
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('staff')
  const [formStatus, setFormStatus] = useState('Active')
  const [formAvatar, setFormAvatar] = useState(null)
  
  // Password Reset
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  
  const isAdmin = useMemo(() => localStorage.getItem('userRole') === 'admin', [])
  const currentUserId = localStorage.getItem('userId')

  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  // --- HELPERS ---
  const showMessage = (title, message, color = 'info') => setMsgModal({ visible: true, title, message, color })

  // --- EFFECTS ---
  useEffect(() => {
    const loadSettings = async () => {
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
      } catch (e) { console.error(e) }
      finally { setInitLoading(false) }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      loadUsers()
    }
  }, [activeTab, isAdmin])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await usersAPI.list()
      if (res.success) setUsers(res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoadingUsers(false) }
  }

  // --- HANDLERS ---
  const saveGeneralSettings = async () => {
    setSavingBiz(true)
    try {
      await Promise.all([
        settingsAPI.updateBusinessInfo({ store_name: storeName, address: bizAddress, contact_number: bizContact, email: bizEmail }),
        settingsAPI.updatePreferences({ cash_enabled: cashEnabled, gcash_enabled: gcashEnabled, cod_enabled: codEnabled })
      ])
      showMessage('Success', 'System configuration updated.', 'success')
    } catch (e) { showMessage('Error', e.message, 'danger') }
    finally { setSavingBiz(false) }
  }

  // User Handlers
  const openAddUser = () => {
    setEditUser(null)
    setFormUsername(''); setFormFirstName(''); setFormLastName(''); setFormEmail(''); setFormPassword('')
    setFormRole('staff'); setFormStatus('Active'); setFormAvatar(null)
    setShowAddUser(true)
  }
  
  const openEditUser = (u) => {
    setEditUser(u)
    setFormUsername(u.username); setFormFirstName(u.first_name); setFormLastName(u.last_name); setFormEmail(u.email)
    setFormRole(u.role); setFormStatus(u.status); setFormAvatar(null)
    setFormPassword('') 
    setShowAddUser(true)
  }

  const handleUserSubmit = async () => {
    if (!formUsername || !formFirstName || !formLastName) return showMessage('Validation', 'Please fill in required fields', 'warning')
    setSavingUser(true)
    try {
        const formData = new FormData()
        formData.append('username', formUsername)
        formData.append('first_name', formFirstName)
        formData.append('last_name', formLastName)
        formData.append('email', formEmail)
        formData.append('role', formRole)
        formData.append('status', formStatus)
        if (formPassword) formData.append('password', formPassword)
        if (formAvatar) formData.append('avatar', formAvatar)

        let response;
        if (editUser) {
             response = await usersAPI.update(editUser.id, formData)
             if (String(editUser.id) === String(currentUserId)) {
                 const updatedUser = response.data
                 if (updatedUser.avatar) localStorage.setItem('userAvatar', updatedUser.avatar)
                 if (updatedUser.first_name) localStorage.setItem('username', updatedUser.first_name)
                 window.dispatchEvent(new Event('userUpdated'))
             }
        }
        else {
             response = await usersAPI.create(formData)
        }

        setShowAddUser(false)
        loadUsers()
        showMessage('Success', `User account ${editUser ? 'updated' : 'created'} successfully.`, 'success')
    } catch (e) { showMessage('Error', e.message, 'danger') }
    finally { setSavingUser(false) }
  }

  const savePassword = async () => {
    if (pwd.next !== pwd.confirm) return showMessage('Error', 'New passwords do not match.', 'warning')
    if (!pwd.current || !pwd.next) return showMessage('Error', 'All fields are required.', 'warning')
    
    setSavingPwd(true)
    try {
      await authAPI.changePassword(currentUserId, pwd.current, pwd.next)
      showMessage('Success', 'Your password has been updated. Please re-login.', 'success')
      setPwd({ current: '', next: '', confirm: '' })
    } catch (e) { showMessage('Error', e.message || 'Failed to update password.', 'danger') }
    finally { setSavingPwd(false) }
  }

  // Filter Users
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.first_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.last_name.toLowerCase().includes(userSearch.toLowerCase())
  )

  if (initLoading) {
    return <div className="d-flex justify-content-center align-items-center" style={{height: '80vh'}}><CSpinner color="primary" variant="grow"/></div>
  }

  return (
    <CContainer fluid>
      <div className="mb-4">
        <h2 className="fw-bold text-brand-navy mb-0" style={{fontFamily: 'Oswald, sans-serif'}}>SYSTEM CONFIGURATION</h2>
        <div className="text-muted small">Manage global store settings, user access, and security.</div>
      </div>

      <CNav variant="tabs" className="settings-tabs mb-4" role="tablist">
        <CNavItem role="presentation">
          <CNavLink 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')}
            component="button"
            role="tab"
          >
            <CIcon icon={cilBuilding} className="me-2"/>General & Preferences
          </CNavLink>
        </CNavItem>
        {isAdmin && (
          <CNavItem role="presentation">
            <CNavLink 
                active={activeTab === 'users'} 
                onClick={() => setActiveTab('users')}
                component="button"
                role="tab"
            >
              <CIcon icon={cilPeople} className="me-2"/>User Management
            </CNavLink>
          </CNavItem>
        )}
        <CNavItem role="presentation">
          <CNavLink 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')}
            component="button"
            role="tab"
          >
            <CIcon icon={cilLockLocked} className="me-2"/>Security
          </CNavLink>
        </CNavItem>
      </CNav>

      {/* --- TAB 1: GENERAL --- */}
      {activeTab === 'general' && (
        <CRow>
          <CCol lg={8}>
            <CCard className="shadow-sm border-0 mb-4">
              <CCardHeader className="bg-white p-3 border-bottom">
                <h5 className="mb-0 fw-bold text-brand-navy">Store Profile</h5>
              </CCardHeader>
              <CCardBody className="p-4">
                <CForm className="row g-3">
                  <CCol md={12}>
                    <CFormLabel htmlFor="storeName" className="fw-bold text-muted small">Store Name</CFormLabel>
                    <CFormInput id="storeName" value={storeName} onChange={e => setStoreName(e.target.value)} />
                  </CCol>
                  <CCol md={12}>
                    <CFormLabel htmlFor="bizAddress" className="fw-bold text-muted small">Business Address</CFormLabel>
                    <CFormInput id="bizAddress" value={bizAddress} onChange={e => setBizAddress(e.target.value)} />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="bizContact" className="fw-bold text-muted small">Contact Number</CFormLabel>
                    <CFormInput id="bizContact" value={bizContact} onChange={e => setBizContact(e.target.value)} />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="bizEmail" className="fw-bold text-muted small">Email Address</CFormLabel>
                    <CFormInput id="bizEmail" value={bizEmail} onChange={e => setBizEmail(e.target.value)} />
                  </CCol>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
          
          <CCol lg={4}>
             <CCard className="shadow-sm border-0 mb-4">
                <CCardHeader className="bg-white p-3 border-bottom">
                   <h5 className="mb-0 fw-bold text-brand-navy">Payment Gateways</h5>
                </CCardHeader>
                <CCardBody className="p-4">
                   <p className="text-muted small mb-3">Toggle available payment options.</p>
                   <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center"><CIcon icon={cilMoney} className="me-2 text-success"/> Cash Payment</div>
                      <CFormSwitch id="switchCash" checked={cashEnabled} onChange={e => setCashEnabled(e.target.checked)}/>
                   </div>
                   <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center"><CIcon icon={cilCreditCard} className="me-2 text-primary"/> GCash / E-Wallet</div>
                      <CFormSwitch id="switchGcash" checked={gcashEnabled} onChange={e => setGcashEnabled(e.target.checked)}/>
                   </div>
                   <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center"><CIcon icon={cilSettings} className="me-2 text-warning"/> Cash on Delivery</div>
                      <CFormSwitch id="switchCod" checked={codEnabled} onChange={e => setCodEnabled(e.target.checked)}/>
                   </div>
                </CCardBody>
             </CCard>
             
             <div className="d-grid">
                {/* [FIX] Success Color for "Save" (Positive Action) */}
                <CButton color="success" className="text-white" size="lg" onClick={saveGeneralSettings} disabled={savingBiz}>
                  {savingBiz ? <CSpinner size="sm" variant="grow"/> : <><CIcon icon={cilSave} className="me-2"/> Save All Settings</>}
                </CButton>
             </div>
          </CCol>
        </CRow>
      )}

      {/* --- TAB 2: USERS --- */}
      {activeTab === 'users' && isAdmin && (
        <CCard className="shadow-sm border-0">
           <CCardHeader className="bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
              {/* [FIX] Branded Search */}
              <div className="brand-search-wrapper" style={{maxWidth: '300px'}}>
                  <span className="brand-search-icon"><CIcon icon={cilSearch}/></span>
                  <input 
                    type="text" 
                    className="brand-search-input" 
                    placeholder="Search users..." 
                    value={userSearch} 
                    onChange={e => setUserSearch(e.target.value)} 
                  />
              </div>
              
              {/* [FIX] Primary Action */}
              <CButton color="primary" className="text-white fw-bold" onClick={openAddUser}>
                  <CIcon icon={cilPlus} className="me-2"/> Add New User
              </CButton>
           </CCardHeader>
           <CCardBody className="p-0">
              <div className="admin-table-container" style={{height: '60vh'}}>
                <table className="admin-table table-hover">
                   <thead className="bg-light sticky-top">
                      <tr>
                         <th className="ps-4" scope="col">Name</th>
                         <th scope="col">Username</th>
                         <th scope="col">Role</th>
                         <th scope="col">Status</th>
                         <th className="text-end pe-4" scope="col">Action</th>
                      </tr>
                   </thead>
                   <tbody>
                      {loadingUsers ? (
                        <tr><td colSpan="5" className="text-center py-5"><CSpinner color="primary" variant="grow"/><div className="mt-2 text-muted small">Loading users...</div></td></tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5 text-muted">No users found.</td></tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id}>
                             <td className="ps-4 fw-bold">{u.first_name} {u.last_name}</td>
                             <td className="text-muted font-monospace small">@{u.username}</td>
                             <td>
                                <CBadge color={u.role === 'admin' ? 'danger' : u.role === 'driver' ? 'info' : 'success'} shape="rounded-pill">
                                  {u.role.toUpperCase()}
                                </CBadge>
                             </td>
                             <td>
                                <span className={`status-badge ${u.status === 'Active' ? 'active' : 'inactive'}`}>
                                  {u.status}
                                </span>
                             </td>
                             <td className="text-end pe-4">
                                <CTooltip content="Edit User">
                                  <CButton size="sm" color="info" variant="ghost" onClick={() => openEditUser(u)}>
                                     <CIcon icon={cilPencil}/>
                                  </CButton>
                                </CTooltip>
                             </td>
                          </tr>
                        ))
                      )}
                   </tbody>
                </table>
              </div>
           </CCardBody>
        </CCard>
      )}

      {/* --- TAB 3: SECURITY --- */}
      {activeTab === 'security' && (
        <CRow className="justify-content-center">
           <CCol md={6} lg={5}>
              <CCard className="shadow-sm border-0 mt-4">
                 <CCardHeader className="bg-danger text-white p-3 text-center">
                    <h5 className="mb-0"><CIcon icon={cilLockLocked} className="me-2"/> Change Password</h5>
                 </CCardHeader>
                 <CCardBody className="p-4">
                    <CForm>
                       <div className="mb-3">
                          <CFormLabel htmlFor="currPass">Current Password</CFormLabel>
                          <CFormInput id="currPass" type="password" value={pwd.current} onChange={e => setPwd({...pwd, current: e.target.value})} />
                       </div>
                       <div className="mb-3">
                          <CFormLabel htmlFor="newPass">New Password</CFormLabel>
                          <CFormInput id="newPass" type="password" value={pwd.next} onChange={e => setPwd({...pwd, next: e.target.value})} />
                       </div>
                       <div className="mb-4">
                          <CFormLabel htmlFor="confPass">Confirm New Password</CFormLabel>
                          <CFormInput id="confPass" type="password" value={pwd.confirm} onChange={e => setPwd({...pwd, confirm: e.target.value})} invalid={pwd.next !== pwd.confirm && pwd.confirm.length > 0} />
                          {pwd.next !== pwd.confirm && pwd.confirm.length > 0 && <div className="text-danger small mt-1">Passwords do not match</div>}
                       </div>
                       <div className="d-grid">
                          {/* [FIX] Danger Color for Security Action */}
                          <CButton color="danger" className="text-white" onClick={savePassword} disabled={savingPwd}>
                             {savingPwd ? <CSpinner size="sm" variant="grow"/> : 'Update Password'}
                          </CButton>
                       </div>
                    </CForm>
                 </CCardBody>
              </CCard>
           </CCol>
        </CRow>
      )}

      {/* USER MODAL */}
      <CModal visible={showAddUser} onClose={() => setShowAddUser(false)} alignment="center" backdrop="static">
        <CModalHeader><CModalTitle>{editUser ? 'Edit User Account' : 'Create New User'}</CModalTitle></CModalHeader>
        <CModalBody>
           <CRow className="g-3">
             <CCol md={12} className="text-center mb-3">
               <div className="p-3 border rounded bg-light d-inline-block">
                 <label className="form-label fw-bold small text-muted">Profile Picture</label>
                 <CFormInput type="file" accept="image/*" onChange={(e) => setFormAvatar(e.target.files[0])} size="sm"/>
               </div>
             </CCol>

             <CCol md={6}>
                <CFormLabel htmlFor="fName" className="small text-muted fw-bold">First Name</CFormLabel>
                <CFormInput id="fName" value={formFirstName} onChange={e => setFormFirstName(e.target.value)} />
             </CCol>
             <CCol md={6}>
                <CFormLabel htmlFor="lName" className="small text-muted fw-bold">Last Name</CFormLabel>
                <CFormInput id="lName" value={formLastName} onChange={e => setFormLastName(e.target.value)} />
             </CCol>
             <CCol md={12}>
                <CFormLabel htmlFor="uName" className="small text-muted fw-bold">Username</CFormLabel>
                <CFormInput id="uName" value={formUsername} onChange={e => setFormUsername(e.target.value)} />
             </CCol>
             <CCol md={12}>
                <CFormLabel htmlFor="uEmail" className="small text-muted fw-bold">Email</CFormLabel>
                <CFormInput id="uEmail" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
             </CCol>
             <CCol md={12}>
                <CFormLabel htmlFor="uPass" className="small text-muted fw-bold">Password {editUser && <span className="fw-normal text-muted">(Leave blank to keep current)</span>}</CFormLabel>
                <CFormInput id="uPass" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} />
             </CCol>
             <CCol md={6}>
                <CFormLabel htmlFor="uRole" className="small text-muted fw-bold">Role</CFormLabel>
                <CFormSelect id="uRole" value={formRole} onChange={e => setFormRole(e.target.value)}>
                   <option value="staff">Staff</option>
                   <option value="admin">Admin</option>
                   <option value="driver">Driver</option>
                </CFormSelect>
             </CCol>
             <CCol md={6}>
                <CFormLabel htmlFor="uStatus" className="small text-muted fw-bold">Status</CFormLabel>
                <CFormSelect id="uStatus" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                   <option value="Active">Active</option>
                   <option value="Inactive">Inactive</option>
                </CFormSelect>
             </CCol>
           </CRow>
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="secondary" onClick={() => setShowAddUser(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleUserSubmit} disabled={savingUser}>{savingUser ? <CSpinner size="sm"/> : 'Save User'}</CButton>
        </CModalFooter>
      </CModal>
      
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})} alignment="center">
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody className="p-4 text-center">
             <div className="fs-5">{msgModal.message}</div>
        </CModalBody>
        <CModalFooter className="justify-content-center">
          <CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SettingsPage