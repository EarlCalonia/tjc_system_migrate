import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CCardHeader, CButton,
  CForm, CFormInput, CFormSelect, CFormLabel, CFormSwitch,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CBadge, CNav, CNavItem, CNavLink, CSpinner, CTooltip, CAvatar, CCallout
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilPlus, cilPencil, cilLockLocked, cilSettings, cilBuilding,
  cilSave, cilCreditCard, cilSearch, cilPeople, cilMoney, cilWarning,
  cilUser, cilCloudUpload, cilTrash, cilHistory // [NEW]
} from '@coreui/icons'
import { settingsAPI, usersAPI, authAPI, activityLogsAPI } from '../../utils/api'

// ... (Keep existing Cropper imports and Global Styles) ...
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import '../../styles/App.css'
import '../../styles/Admin.css'
import '../../styles/SettingsPage.css'

const ASSET_URL = 'http://localhost:5000'
const CROP_ASPECT = 1;

// ... (Keep ImageCropModal Component) ...
const ImageCropModal = ({ visible, imageSrc, onClose, onApply, loading }) => {
    // ... (Keep existing logic) ...
    const [crop, setCrop] = useState(undefined);
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    useEffect(() => { if(visible) { setCrop(undefined); setCompletedCrop(null); } }, [visible]);

    const onImageLoad = useCallback((e) => {
        const { width, height } = e.currentTarget;
        imgRef.current = e.currentTarget;
        const initCrop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, CROP_ASPECT, width, height), width, height);
        setCrop(initCrop);
        setCompletedCrop(initCrop);
    }, []);

    const handleApply = async () => {
        if (!imgRef.current || !completedCrop) return;
        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgRef.current, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
        onApply(blob);
    };

    return (
        <CModal visible={visible} onClose={onClose} size="lg" alignment="center" backdrop="static">
            <CModalHeader className="bg-brand-navy"><CModalTitle className="text-white font-oswald">ADJUST PROFILE PHOTO</CModalTitle></CModalHeader>
            <CModalBody className="d-flex justify-content-center bg-dark p-0 overflow-hidden">
                {imageSrc && (<div style={{maxHeight: '60vh'}}><ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={CROP_ASPECT} circularCrop={true}><img src={imageSrc} alt="Crop" style={{ maxWidth: '100%', maxHeight: '60vh' }} crossOrigin="anonymous" onLoad={onImageLoad} /></ReactCrop></div>)}
            </CModalBody>
            <CModalFooter className="bg-light border-top-0">
                <button className="btn-brand btn-brand-outline" onClick={onClose}>Cancel</button>
                <button className="btn-brand btn-brand-primary" onClick={handleApply} disabled={loading || !completedCrop}>{loading ? <CSpinner size="sm"/> : 'Apply & Save'}</button>
            </CModalFooter>
        </CModal>
    )
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [initLoading, setInitLoading] = useState(true)
  
  // Business & Prefs (Keep existing)
  const [storeName, setStoreName] = useState(''); const [bizAddress, setBizAddress] = useState(''); const [bizContact, setBizContact] = useState(''); const [bizEmail, setBizEmail] = useState('')
  const [cashEnabled, setCashEnabled] = useState(true); const [gcashEnabled, setGcashEnabled] = useState(true); const [codEnabled, setCodEnabled] = useState(true); const [savingBiz, setSavingBiz] = useState(false)
  
  // Users (Keep existing)
  const [users, setUsers] = useState([]); const [userSearch, setUserSearch] = useState(''); const [loadingUsers, setLoadingUsers] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false); const [savingUser, setSavingUser] = useState(false); const [editUser, setEditUser] = useState(null)
  const [formUsername, setFormUsername] = useState(''); const [formFirstName, setFormFirstName] = useState(''); const [formLastName, setFormLastName] = useState('')
  const [formEmail, setFormEmail] = useState(''); const [formPassword, setFormPassword] = useState(''); const [formRole, setFormRole] = useState('staff'); const [formStatus, setFormStatus] = useState('Active'); const [formAvatar, setFormAvatar] = useState(null)
  
  // Crop
  const [cropVisible, setCropVisible] = useState(false); const [cropSrc, setCropSrc] = useState(null); const fileInputRef = useRef(null)

  // Password (Keep existing)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' }); const [savingPwd, setSavingPwd] = useState(false)
  
  // [NEW] Maintenance State
  const [logCount, setLogCount] = useState(0)
  const [retentionDays, setRetentionDays] = useState(60)
  const [pruning, setPruning] = useState(false)

  const isAdmin = useMemo(() => localStorage.getItem('userRole') === 'admin', [])
  const currentUserId = localStorage.getItem('userId')
  const currentUsername = localStorage.getItem('username')

  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })
  const showMessage = (title, message, color = 'info') => setMsgModal({ visible: true, title, message, color })

  // --- API CALLS ---
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await settingsAPI.get()
        if (s.success && s.data) {
          setStoreName(s.data.store_name || ''); setBizAddress(s.data.address || ''); setBizContact(s.data.contact_number || ''); setBizEmail(s.data.email || '')
          setCashEnabled(!!s.data.cash_enabled); setGcashEnabled(!!s.data.gcash_enabled); setCodEnabled(!!s.data.cod_enabled)
        }
      } catch (e) { console.error(e) } finally { setInitLoading(false) }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) loadUsers()
    if (activeTab === 'maintenance' && isAdmin) loadLogStats() // [NEW]
  }, [activeTab, isAdmin])

  const loadUsers = async () => { /* ... existing ... */ 
      setLoadingUsers(true)
      try { const res = await usersAPI.list(); if (res.success) setUsers(res.data || []) } catch (e) { console.error(e) } finally { setLoadingUsers(false) }
  }

  // [NEW] Load Log Stats
  const loadLogStats = async () => {
      try {
          const res = await activityLogsAPI.getStats();
          if (res.success) setLogCount(res.data.total);
      } catch (e) { console.error(e); }
  }

  // --- HANDLERS (Keep existing handlers for General, Users, Password) ---
  const saveGeneralSettings = async () => { /* ... existing ... */ 
      setSavingBiz(true)
      try {
        await Promise.all([
          settingsAPI.updateBusinessInfo({ store_name: storeName, address: bizAddress, contact_number: bizContact, email: bizEmail }),
          settingsAPI.updatePreferences({ cash_enabled: cashEnabled, gcash_enabled: gcashEnabled, cod_enabled: codEnabled })
        ])
        showMessage('Success', 'System configuration updated.', 'success')
      } catch (e) { showMessage('Error', e.message, 'danger') } finally { setSavingBiz(false) }
  }
  
  const openAddUser = () => { /* ... existing ... */ setEditUser(null); setFormUsername(''); setFormFirstName(''); setFormLastName(''); setFormEmail(''); setFormPassword(''); setFormRole('staff'); setFormStatus('Active'); setFormAvatar(null); setShowAddUser(true); }
  const openEditUser = (u) => { /* ... existing ... */ setEditUser(u); setFormUsername(u.username); setFormFirstName(u.first_name); setFormLastName(u.last_name); setFormEmail(u.email); setFormRole(u.role); setFormStatus(u.status); setFormAvatar(null); setFormPassword(''); setShowAddUser(true); }
  
  const handleFileChange = (e) => { /* ... existing ... */ if (e.target.files && e.target.files.length > 0) { const file = e.target.files[0]; const reader = new FileReader(); reader.onloadend = () => { setCropSrc(reader.result); setCropVisible(true); }; reader.readAsDataURL(file); e.target.value = ''; } }
  const handleCropResult = (blob) => { /* ... existing ... */ const file = new File([blob], "avatar.jpg", { type: "image/jpeg" }); setFormAvatar(file); setCropVisible(false); }
  
  const handleUserSubmit = async () => { /* ... existing ... */ 
    if (!formUsername || !formFirstName || !formLastName) return showMessage('Validation', 'Please fill in required fields', 'warning')
    setSavingUser(true)
    try {
        const formData = new FormData(); formData.append('username', formUsername); formData.append('first_name', formFirstName); formData.append('last_name', formLastName); formData.append('email', formEmail); formData.append('role', formRole); formData.append('status', formStatus)
        if (formPassword) formData.append('password', formPassword); if (formAvatar) formData.append('avatar', formAvatar)
        let response;
        if (editUser) {
             response = await usersAPI.update(editUser.id, formData)
             if (String(editUser.id) === String(currentUserId)) {
                 const updatedUser = response.data; if (updatedUser?.avatar) localStorage.setItem('userAvatar', updatedUser.avatar); if (updatedUser?.first_name) localStorage.setItem('username', updatedUser.first_name); window.dispatchEvent(new Event('userUpdated'))
             }
        } else { response = await usersAPI.create(formData) }
        setShowAddUser(false); loadUsers(); showMessage('Success', `User account ${editUser ? 'updated' : 'created'} successfully.`, 'success')
    } catch (e) { showMessage('Error', e.message, 'danger') } finally { setSavingUser(false) }
  }

  const savePassword = async () => { /* ... existing ... */ 
    if (pwd.next !== pwd.confirm) return showMessage('Error', 'New passwords do not match.', 'warning'); if (!pwd.current || !pwd.next) return showMessage('Error', 'All fields are required.', 'warning')
    setSavingPwd(true); try { await authAPI.changePassword(currentUserId, pwd.current, pwd.next); showMessage('Success', 'Your password has been updated. Please re-login.', 'success'); setPwd({ current: '', next: '', confirm: '' }) } catch (e) { showMessage('Error', e.message || 'Failed to update password.', 'danger') } finally { setSavingPwd(false) }
  }

  // [NEW] Prune Handler
  const handlePruneLogs = async () => {
      setPruning(true);
      try {
          const res = await activityLogsAPI.prune(retentionDays, currentUsername);
          if (res.success) {
              showMessage('Cleanup Complete', res.message, 'success');
              loadLogStats();
          }
      } catch (e) {
          showMessage('Error', 'Failed to prune logs.', 'danger');
      } finally {
          setPruning(false);
      }
  }

  const getPreviewImage = () => { if (formAvatar) return URL.createObjectURL(formAvatar); if (editUser && editUser.avatar) return editUser.avatar.startsWith('http') ? editUser.avatar : `${ASSET_URL}${editUser.avatar}`; return null }
  const previewSrc = getPreviewImage()
  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.first_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.last_name?.toLowerCase().includes(userSearch.toLowerCase()))

  if (initLoading) return <div className="d-flex justify-content-center align-items-center" style={{height: '80vh'}}><CSpinner color="primary"/></div>

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="mb-4">
        <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald, sans-serif', letterSpacing: '1px'}}>SYSTEM CONFIGURATION</h2>
        <div className="text-muted small fw-semibold">Manage global store settings, user access, and security.</div>
      </div>

      <CNav variant="tabs" className="settings-tabs mb-4" role="tablist">
        <CNavItem><CNavLink active={activeTab === 'general'} onClick={() => setActiveTab('general')} style={{cursor: 'pointer'}}><CIcon icon={cilBuilding} className="me-2"/>General & Preferences</CNavLink></CNavItem>
        {isAdmin && <CNavItem><CNavLink active={activeTab === 'users'} onClick={() => setActiveTab('users')} style={{cursor: 'pointer'}}><CIcon icon={cilPeople} className="me-2"/>User Management</CNavLink></CNavItem>}
        {isAdmin && <CNavItem><CNavLink active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} style={{cursor: 'pointer'}}><CIcon icon={cilHistory} className="me-2"/>Maintenance</CNavLink></CNavItem>}
        <CNavItem><CNavLink active={activeTab === 'security'} onClick={() => setActiveTab('security')} style={{cursor: 'pointer'}}><CIcon icon={cilLockLocked} className="me-2"/>Security</CNavLink></CNavItem>
      </CNav>

      {/* --- TAB 1: GENERAL --- */}
      {activeTab === 'general' && (
        <CRow>
          <CCol lg={8}>
            <CCard className="shadow-sm border-0 mb-4"><CCardHeader className="bg-white p-3 border-bottom"><h5 className="mb-0 fw-bold text-brand-navy" style={{fontFamily: 'Oswald'}}>Store Profile</h5></CCardHeader><CCardBody className="p-4"><CForm className="row g-3"><CCol md={12}><CFormLabel className="small fw-bold text-muted">Store Name</CFormLabel><CFormInput value={storeName} onChange={e => setStoreName(e.target.value)} /></CCol><CCol md={12}><CFormLabel className="small fw-bold text-muted">Business Address</CFormLabel><CFormInput value={bizAddress} onChange={e => setBizAddress(e.target.value)} /></CCol><CCol md={6}><CFormLabel className="small fw-bold text-muted">Contact Number</CFormLabel><CFormInput value={bizContact} onChange={e => setBizContact(e.target.value)} /></CCol><CCol md={6}><CFormLabel className="small fw-bold text-muted">Email Address</CFormLabel><CFormInput value={bizEmail} onChange={e => setBizEmail(e.target.value)} /></CCol></CForm></CCardBody></CCard>
          </CCol>
          <CCol lg={4}>
             <CCard className="shadow-sm border-0 mb-4"><CCardHeader className="bg-white p-3 border-bottom"><h5 className="mb-0 fw-bold text-brand-navy" style={{fontFamily: 'Oswald'}}>Payment Gateways</h5></CCardHeader><CCardBody className="p-4"><p className="text-muted small mb-3">Toggle available payment options.</p><div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom"><div className="d-flex align-items-center fw-semibold text-brand-navy"><CIcon icon={cilMoney} className="me-2 text-success"/> Cash Payment</div><CFormSwitch checked={cashEnabled} onChange={e => setCashEnabled(e.target.checked)}/></div><div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom"><div className="d-flex align-items-center fw-semibold text-brand-navy"><CIcon icon={cilCreditCard} className="me-2 text-primary"/> GCash / E-Wallet</div><CFormSwitch checked={gcashEnabled} onChange={e => setGcashEnabled(e.target.checked)}/></div><div className="d-flex justify-content-between align-items-center"><div className="d-flex align-items-center fw-semibold text-brand-navy"><CIcon icon={cilSettings} className="me-2 text-warning"/> Cash on Delivery</div><CFormSwitch checked={codEnabled} onChange={e => setCodEnabled(e.target.checked)}/></div></CCardBody></CCard>
             <div className="d-grid"><button className="btn-brand btn-brand-primary py-2" onClick={saveGeneralSettings} disabled={savingBiz}>{savingBiz ? <CSpinner size="sm"/> : <><CIcon icon={cilSave} className="me-2"/> SAVE ALL SETTINGS</>}</button></div>
          </CCol>
        </CRow>
      )}

      {/* --- TAB 2: USERS --- */}
      {activeTab === 'users' && isAdmin && (
        <CCard className="shadow-sm border-0">
           <CCardHeader className="bg-white p-3 border-bottom d-flex justify-content-between align-items-center"><div className="brand-search-wrapper" style={{maxWidth: '300px'}}><span className="brand-search-icon"><CIcon icon={cilSearch}/></span><input type="text" className="brand-search-input" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} /></div><button className="btn-brand btn-brand-primary" onClick={openAddUser}><CIcon icon={cilPlus} className="me-2"/> NEW USER</button></CCardHeader>
           <CCardBody className="p-0"><div className="admin-table-container border-0 mb-0"><table className="admin-table"><thead><tr><th className="ps-4">Name</th><th>Username</th><th>Role</th><th className="text-center">Status</th><th className="text-end pe-4">Action</th></tr></thead><tbody>{loadingUsers ? (<tr><td colSpan="5" className="text-center py-5"><CSpinner color="primary"/></td></tr>) : filteredUsers.length === 0 ? (<tr><td colSpan="5" className="text-center py-5 text-muted">No users found.</td></tr>) : (filteredUsers.map(u => (<tr key={u.id}><td className="ps-4"><div className="d-flex align-items-center"><div className="bg-light rounded-circle p-1 me-2 border d-flex justify-content-center align-items-center overflow-hidden" style={{width: '32px', height: '32px'}}>{u.avatar ? <img src={u.avatar.startsWith('http') ? u.avatar : `${ASSET_URL}${u.avatar}`} alt="" style={{width: '100%', height:'100%', objectFit: 'cover'}}/> : <CIcon icon={cilUser} size="sm" className="text-secondary"/>}</div><div className="fw-bold text-dark">{u.first_name} {u.last_name}</div></div></td><td className="text-muted font-monospace small">@{u.username}</td><td><CBadge color={u.role === 'admin' ? 'danger' : u.role === 'driver' ? 'warning' : 'info'} shape="rounded-pill" className="text-uppercase px-3">{u.role}</CBadge></td><td className="text-center"><span className={`status-badge ${u.status === 'Active' ? 'active' : 'cancelled'}`}>{u.status}</span></td><td className="text-end pe-4"><button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => openEditUser(u)}><CIcon icon={cilPencil}/></button></td></tr>)))}</tbody></table></div></CCardBody>
        </CCard>
      )}

      {/* --- [NEW] TAB 3: MAINTENANCE (Pruning) --- */}
      {activeTab === 'maintenance' && isAdmin && (
          <CRow>
              <CCol md={6}>
                  <CCard className="shadow-sm border-0">
                      <CCardHeader className="bg-white p-3 border-bottom"><h5 className="mb-0 fw-bold text-brand-navy" style={{fontFamily: 'Oswald'}}>Data Retention Policy</h5></CCardHeader>
                      <CCardBody className="p-4">
                          <CCallout color="warning" className="mb-4">
                              <div className="fw-bold text-dark">Warning: Permanent Action</div>
                              <div className="small">Deleting old logs is permanent and cannot be undone. It is recommended to keep at least 30-60 days of history for auditing purposes.</div>
                          </CCallout>

                          <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded border">
                              <div><div className="text-muted small fw-bold text-uppercase">Current Storage</div><div className="fs-4 fw-bold text-brand-navy">{logCount.toLocaleString()} Records</div></div>
                              <CIcon icon={cilHistory} size="3xl" className="text-black-50"/>
                          </div>

                          <CFormLabel className="fw-bold text-muted small">Cleanup Strategy</CFormLabel>
                          <div className="d-flex gap-2 align-items-center mb-4">
                               <div className="flex-grow-1">
                                   <CFormSelect value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)}>
                                       <option value={30}>Keep last 30 Days (Recommended)</option>
                                       <option value={60}>Keep last 60 Days</option>
                                       <option value={90}>Keep last 90 Days</option>
                                       <option value={180}>Keep last 6 Months</option>
                                       <option value={365}>Keep last 1 Year</option>
                                   </CFormSelect>
                               </div>
                               <button className="btn-brand btn-brand-danger text-nowrap" onClick={handlePruneLogs} disabled={pruning}>
                                   {pruning ? <CSpinner size="sm"/> : <><CIcon icon={cilTrash} className="me-2"/> Clean Now</>}
                               </button>
                          </div>
                      </CCardBody>
                  </CCard>
              </CCol>
          </CRow>
      )}

      {/* --- TAB 4: SECURITY --- */}
      {activeTab === 'security' && (
        <CRow className="justify-content-center">
           <CCol md={6} lg={5}>
              <CCard className="shadow-sm border-0 mt-4"><CCardHeader className="bg-danger text-white p-3 text-center"><h5 className="mb-0 text-white font-oswald"><CIcon icon={cilLockLocked} className="me-2"/> CHANGE PASSWORD</h5></CCardHeader><CCardBody className="p-4"><CForm><div className="mb-3"><CFormLabel className="small fw-bold text-muted">Current Password</CFormLabel><CFormInput type="password" value={pwd.current} onChange={e => setPwd({...pwd, current: e.target.value})} /></div><div className="mb-3"><CFormLabel className="small fw-bold text-muted">New Password</CFormLabel><CFormInput type="password" value={pwd.next} onChange={e => setPwd({...pwd, next: e.target.value})} /></div><div className="mb-4"><CFormLabel className="small fw-bold text-muted">Confirm New Password</CFormLabel><CFormInput type="password" value={pwd.confirm} onChange={e => setPwd({...pwd, confirm: e.target.value})} invalid={pwd.next !== pwd.confirm && pwd.confirm.length > 0} />{pwd.next !== pwd.confirm && pwd.confirm.length > 0 && <div className="text-danger small mt-1">Passwords do not match</div>}</div><div className="d-grid"><button className="btn btn-danger text-white fw-bold py-2" onClick={savePassword} disabled={savingPwd}>{savingPwd ? <CSpinner size="sm"/> : 'UPDATE PASSWORD'}</button></div></CForm></CCardBody></CCard>
           </CCol>
        </CRow>
      )}

      {/* --- USER MODAL (With Crop Trigger) --- */}
      <CModal visible={showAddUser} onClose={() => setShowAddUser(false)} alignment="center" backdrop="static" size="lg">
        <CModalHeader className="bg-brand-navy"><CModalTitle className="text-white font-oswald">{editUser ? 'EDIT USER ACCOUNT' : 'CREATE NEW USER'}</CModalTitle></CModalHeader>
        <CModalBody className="p-4">
           <CRow className="g-3">
             <CCol md={12} className="text-center mb-3">
               <div className="d-flex flex-column align-items-center">
                   <div className="mb-3 position-relative" onClick={() => fileInputRef.current?.click()} style={{cursor: 'pointer'}}>
                       <CAvatar src={previewSrc || undefined} color={!previewSrc ? 'secondary' : undefined} size="xl" style={{ width: '100px', height: '100px', objectFit: 'cover' }} className="border border-4 border-light shadow-sm">{!previewSrc && (editUser ? editUser.username?.charAt(0).toUpperCase() : <CIcon icon={cilUser} />)}</CAvatar>
                       <div className="position-absolute bottom-0 end-0 bg-brand-blue text-white rounded-circle p-1 small border border-white"><CIcon icon={cilPencil} size="sm"/></div>
                   </div>
                   <div className="p-2"><button className="btn btn-sm btn-ghost-primary" onClick={() => fileInputRef.current?.click()}><CIcon icon={cilCloudUpload} className="me-1"/> Change Photo</button><input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange}/></div>
               </div>
             </CCol>
             <CCol md={6}><CFormLabel className="small fw-bold text-muted">First Name</CFormLabel><CFormInput value={formFirstName} onChange={e => setFormFirstName(e.target.value)} /></CCol><CCol md={6}><CFormLabel className="small fw-bold text-muted">Last Name</CFormLabel><CFormInput value={formLastName} onChange={e => setFormLastName(e.target.value)} /></CCol><CCol md={12}><CFormLabel className="small fw-bold text-muted">Username</CFormLabel><CFormInput value={formUsername} onChange={e => setFormUsername(e.target.value)} /></CCol><CCol md={12}><CFormLabel className="small fw-bold text-muted">Email Address</CFormLabel><CFormInput type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} /></CCol><CCol md={12}><CFormLabel className="small fw-bold text-muted">Password {editUser && <span className="fw-normal text-muted fst-italic ms-1">(Leave blank to keep current)</span>}</CFormLabel><CFormInput type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} /></CCol><CCol md={6}><CFormLabel className="small fw-bold text-muted">Role</CFormLabel><CFormSelect value={formRole} onChange={e => setFormRole(e.target.value)} className="brand-select"><option value="staff">Staff</option><option value="admin">Admin</option><option value="driver">Driver</option></CFormSelect></CCol><CCol md={6}><CFormLabel className="small fw-bold text-muted">Status</CFormLabel><CFormSelect value={formStatus} onChange={e => setFormStatus(e.target.value)} className="brand-select"><option value="Active">Active</option><option value="Inactive">Inactive</option></CFormSelect></CCol>
           </CRow>
        </CModalBody>
        <CModalFooter className="bg-light border-top-0"><button className="btn-brand btn-brand-outline" onClick={() => setShowAddUser(false)}>Cancel</button><button className="btn-brand btn-brand-primary" onClick={handleUserSubmit} disabled={savingUser}>{savingUser ? <CSpinner size="sm"/> : 'Save User'}</button></CModalFooter>
      </CModal>
      
      <ImageCropModal visible={cropVisible} imageSrc={cropSrc} onClose={() => setCropVisible(false)} onApply={handleCropResult} loading={false} />
      
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})} alignment="center"><CModalHeader className={`bg-${msgModal.color === 'danger' ? 'brand-navy' : msgModal.color} text-white`}><CModalTitle className="font-oswald">{msgModal.title.toUpperCase()}</CModalTitle></CModalHeader><CModalBody className="p-4 text-center"><div className="fs-5">{msgModal.message}</div></CModalBody><CModalFooter className="justify-content-center bg-light border-top-0"><button className="btn-brand btn-brand-outline" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</button></CModalFooter></CModal>
    </CContainer>
  )
}

export default SettingsPage