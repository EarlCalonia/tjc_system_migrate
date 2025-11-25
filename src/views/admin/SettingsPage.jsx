import React, { useEffect, useMemo, useState } from 'react';
// Navbar import removed
import { settingsAPI, usersAPI, authAPI } from '../../utils/api';
import { BsPlusLg, BsEye, BsEyeSlash } from 'react-icons/bs';
import '../../styles/SettingsPage.css';

// --- CUSTOM MESSAGE BOX COMPONENT ---
const MessageBox = ({ isOpen, title, message, type, onClose, onConfirm }) => {
  if (!isOpen) return null;
  let headerColor = '#f8f9fa';
  let titleColor = '#2c3e50';
  if (type === 'error') { headerColor = '#fee2e2'; titleColor = '#b91c1c'; } 
  else if (type === 'success') { headerColor = '#dcfce7'; titleColor = '#166534'; } 
  else if (type === 'warning') { headerColor = '#fff7ed'; titleColor = '#c2410c'; }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '90%', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="modal-header" style={{ backgroundColor: headerColor, borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '15px 20px' }}>
          <h3 style={{ color: titleColor, fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>{title}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body" style={{ padding: '25px 20px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div className="modal-actions" style={{ padding: '15px 20px', backgroundColor: '#f9fafb' }}>
          <button onClick={onClose} className="confirm-btn" style={{ marginLeft: 'auto' }}>OK</button>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [storeName, setStoreName] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizContact, setBizContact] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [savingBiz, setSavingBiz] = useState(false);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [gcashEnabled, setGcashEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formUsername, setFormUsername] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formMiddleName, setFormMiddleName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('staff');
  const [formStatus, setFormStatus] = useState('Active');
  const [formAvatarFile, setFormAvatarFile] = useState(null);
  const [formAvatarPreview, setFormAvatarPreview] = useState(null);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);
  const isAdmin = useMemo(() => (localStorage.getItem('userRole') === 'admin'), []);
  const userId = useMemo(() => localStorage.getItem('userId'), []);

  // Message Box State
  const [msgBox, setMsgBox] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const showMessage = (title, message, type = 'info') => setMsgBox({ isOpen: true, title, message, type });
  const closeMessage = () => setMsgBox(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoadingUsers(true);
        const settingsRes = await settingsAPI.get();
        if (settingsRes.success && settingsRes.data) {
          const s = settingsRes.data; setStoreName(s.store_name || ''); setBizAddress(s.address || ''); setBizContact(s.contact_number || ''); setBizEmail(s.email || ''); setCashEnabled(!!s.cash_enabled); setGcashEnabled(!!s.gcash_enabled); setCodEnabled(!!s.cod_enabled);
        }
        if (isAdmin) { const usersRes = await usersAPI.list(); if (usersRes.success && usersRes.data) setUsers(usersRes.data); }
      } catch (err) { console.error("Failed to fetch settings:", err); } finally { setLoadingUsers(false); }
    };
    fetchAllData();
  }, [isAdmin]);

  const saveBusinessInfo = async () => {
    try {
      setSavingBiz(true); await settingsAPI.updateBusinessInfo({ store_name: storeName, address: bizAddress, contact_number: bizContact, email: bizEmail });
      showMessage('Success', 'Business information saved', 'success');
    } catch (e) { showMessage('Error', e.message || 'Failed to save business information', 'error'); } finally { setSavingBiz(false); }
  };

  const savePreferences = async () => {
    try {
      setSavingPrefs(true); await settingsAPI.updatePreferences({ cash_enabled: cashEnabled, gcash_enabled: gcashEnabled, cod_enabled: codEnabled });
      showMessage('Success', 'Preferences saved', 'success');
    } catch (e) { showMessage('Error', e.message || 'Failed to save preferences', 'error'); } finally { setSavingPrefs(false); }
  };
  
  const resetForm = () => { setEditUser(null); setIsEditMode(false); setFormUsername(''); setFormFirstName(''); setFormMiddleName(''); setFormLastName(''); setFormEmail(''); setFormPassword(''); setFormRole('staff'); setFormStatus('Active'); setFormAvatarFile(null); setFormAvatarPreview(null); };
  const openAdd = () => { resetForm(); setShowAddUser(true); };
  const openEdit = (u) => { setEditUser(u); setIsEditMode(true); setFormUsername(u.username || ''); setFormFirstName(u.first_name || ''); setFormMiddleName(u.middle_name || ''); setFormLastName(u.last_name || ''); setFormEmail(u.email || ''); setFormPassword(''); setFormRole(u.role || 'staff'); setFormStatus(u.status || 'Active'); setFormAvatarFile(null); setFormAvatarPreview(u.avatar ? `http://localhost:5000${u.avatar}` : null); setShowAddUser(true); };
  const handleAvatarChange = (e) => { const file = e.target.files[0]; if (file) { setFormAvatarFile(file); setFormAvatarPreview(URL.createObjectURL(file)); } };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingUser(true);
      const fd = new FormData(); fd.append('username', formUsername); fd.append('first_name', formFirstName); fd.append('middle_name', formMiddleName || ''); fd.append('last_name', formLastName); fd.append('email', formEmail); fd.append('role', formRole); fd.append('status', formStatus);
      if (formAvatarFile) fd.append('avatar', formAvatarFile);
      if (isEditMode) {
        if (formPassword) fd.append('password', formPassword);
        const res = await usersAPI.update(editUser.id, fd);
        if (res && res.success && String(editUser.id) === String(userId)) {
          if (typeof res.avatar !== 'undefined') { if (res.avatar) localStorage.setItem('avatar', res.avatar); else localStorage.removeItem('avatar'); window.dispatchEvent(new Event('avatarChanged')); }
          if (formUsername) localStorage.setItem('username', formUsername);
        }
      } else {
        if (!formPassword) { showMessage('Validation Error', 'Password is required for new users.', 'warning'); return; }
        fd.append('password', formPassword); await usersAPI.create(fd);
      }
      setShowAddUser(false); resetForm(); await loadUsers(); showMessage('Success', 'User saved successfully.', 'success');
    } catch (e) { showMessage('Error', e.message || 'Failed to save user', 'error'); } finally { setSavingUser(false); }
  };
  
  const loadUsers = async () => { try { setLoadingUsers(true); const res = await usersAPI.list(); setUsers(res.data || []); } catch (e) { console.error('Load users failed:', e); } finally { setLoadingUsers(false); } };

  const saveNewPassword = async () => {
    try {
      setSavingPwd(true);
      if (!pwd.current || !pwd.next || !pwd.confirm) { showMessage('Missing Fields', 'Please fill out all password fields', 'warning'); return; }
      if (pwd.next !== pwd.confirm) { showMessage('Mismatch', 'New passwords do not match', 'warning'); return; }
      await authAPI.changePassword(userId, pwd.current, pwd.next);
      showMessage('Success', 'Password updated', 'success'); setPwd({ current: '', next: '', confirm: '' });
    } catch (e) { showMessage('Error', e.message || 'Failed to update password', 'error'); } finally { setSavingPwd(false); }
  };

  return (
    <div className="admin-container">
      <div className="settings-grid">
        <section className="card"><h2>Business Information</h2><p className="section-sub">Update your store details and contact information</p><div className="form-group"><label>Store Name</label><input className="form-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div><div className="form-group"><label>Address</label><input className="form-input" value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} /></div><div className="form-group"><label>Contact Number</label><input className="form-input" value={bizContact} onChange={(e) => setBizContact(e.target.value)} /></div><div className="form-group"><label>Email</label><input className="form-input" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} /></div><button className="btn btn-primary" onClick={saveBusinessInfo} disabled={savingBiz}>{savingBiz ? 'Saving...' : 'Save Business Information'}</button></section>
        <section className="card"><div className="card-head"><h2>User Management</h2>{isAdmin && (<button className="btn btn-outline" onClick={openAdd}><BsPlusLg /> Add User</button>)}</div><div className="table-container"><table className="table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{loadingUsers ? (<tr><td colSpan="4" style={{textAlign: 'center'}}>Loading...</td></tr>) : (users.map(u => (<tr key={u.id}><td>{u.username}</td><td><span className={`badge role-${(u.role||'').toLowerCase()}`}>{u.role}</span></td><td><span className={`badge status-${(u.status||'').toLowerCase()}`}>{u.status}</span></td><td><button className="btn btn-outline" style={{height: '36px', padding: '0 12px'}} onClick={() => openEdit(u)}>Edit</button></td></tr>)))}</tbody></table></div></section>
        <section className="card"><h2>System Preferences</h2><p className="section-sub">Configure payments, and shipping options</p><div className="switch-row"><label>Cash Payment</label><input type="checkbox" checked={cashEnabled} onChange={(e) => setCashEnabled(e.target.checked)} /></div><div className="switch-row"><label>GCash Payment</label><input type="checkbox" checked={gcashEnabled} onChange={(e) => setGcashEnabled(e.target.checked)} /></div><div className="switch-row"><label>Cash On Delivery</label><input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} /></div><button className="btn btn-primary" onClick={savePreferences} disabled={savingPrefs}>{savingPrefs ? 'Saving...' : 'Save Preferences'}</button></section>
        <section className="card"><h2>Password Management</h2><p className="section-sub">Update your account password for security</p><div className="form-group"><label>Current Password</label><div className="password-input"><input className="form-input" type={showPwd.current ? 'text' : 'password'} placeholder="Enter your current password" value={pwd.current} onChange={(e)=>setPwd({...pwd, current: e.target.value})} /><button type="button" onClick={()=>setShowPwd({...showPwd, current: !showPwd.current})}>{showPwd.current ? <BsEyeSlash/> : <BsEye/>}</button></div></div><div className="form-group"><label>New Password</label><div className="password-input"><input className="form-input" type={showPwd.next ? 'text' : 'password'} placeholder="Enter your new password" value={pwd.next} onChange={(e)=>setPwd({...pwd, next: e.target.value})} /><button type="button" onClick={()=>setShowPwd({...showPwd, next: !showPwd.next})}>{showPwd.next ? <BsEyeSlash/> : <BsEye/>}</button></div></div><div className="form-group"><label>Confirm New Password</label><div className="password-input"><input className="form-input" type={showPwd.confirm ? 'text' : 'password'} placeholder="Confirm your new password" value={pwd.confirm} onChange={(e)=>setPwd({...pwd, confirm: e.target.value})} /><button type="button" onClick={()=>setShowPwd({...showPwd, confirm: !showPwd.confirm})}>{showPwd.confirm ? <BsEyeSlash/> : <BsEye/>}</button></div></div><button className="btn btn-primary" onClick={saveNewPassword} disabled={savingPwd}>{savingPwd ? 'Saving...' : 'Save New Password'}</button></section>
      </div>
      <MessageBox isOpen={msgBox.isOpen} title={msgBox.title} message={msgBox.message} type={msgBox.type} onClose={closeMessage} />
      {showAddUser && (
        <div className="modal-overlay" onClick={()=>{ setShowAddUser(false); resetForm(); }}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h3>{isEditMode ? 'Edit User' : 'Add User'}</h3><button onClick={()=>{ setShowAddUser(false); resetForm(); }} className="close-btn">×</button></div>
            <form onSubmit={handleUserSubmit}>
              <div className="modal-body">
                <div className="form-row"><div className="form-group"><label>First Name <span style={{color: 'red'}}>*</span></label><input className="form-input" value={formFirstName} onChange={(e)=>setFormFirstName(e.target.value)} placeholder="Enter first name" required /></div><div className="form-group"><label>Last Name <span style={{color: 'red'}}>*</span></label><input className="form-input" value={formLastName} onChange={(e)=>setFormLastName(e.target.value)} placeholder="Enter last name" required /></div></div>
                 <div className="form-group"><label>Middle Name</label><input className="form-input" value={formMiddleName} onChange={(e)=>setFormMiddleName(e.target.value)} placeholder="Enter middle name (optional)" /></div>
                <div className="form-group"><label>Username <span style={{color: 'red'}}>*</span></label><input className="form-input" value={formUsername} onChange={(e)=>setFormUsername(e.target.value)} placeholder="Enter username" required /></div>
                <div className="form-group"><label>Email <span style={{color: 'red'}}>*</span></label><input className="form-input" type="email" value={formEmail} onChange={(e)=>setFormEmail(e.target.value)} required /></div>
                <div className="form-group"><label>Password {isEditMode ? '(Leave blank to keep unchanged)' : <span style={{color: 'red'}}>*</span>}</label><input className="form-input" type="password" value={formPassword} onChange={(e)=>setFormPassword(e.target.value)} required={!isEditMode} /></div>
                <div className="form-row"><div className="form-group"><label>Role</label><select className="form-select" value={formRole} onChange={(e)=>setFormRole(e.target.value)}><option value="admin">Admin</option><option value="driver">Driver</option><option value="staff">Staff</option></select></div><div className="form-group"><label>Status</label><select className="form-select" value={formStatus} onChange={(e)=>setFormStatus(e.target.value)}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div></div>
                <div className="form-group"><label>Avatar</label>{formAvatarPreview && <img src={formAvatarPreview} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }} />}<input className="form-input" type="file" accept="image/*" onChange={handleAvatarChange} /></div>
              </div>
              <div className="modal-actions"><button type="button" className="cancel-btn" onClick={()=>{ setShowAddUser(false); resetForm(); }}>Cancel</button><button type="submit" className="save-btn" disabled={savingUser}>{savingUser ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add User')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;