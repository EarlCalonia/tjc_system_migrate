import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  CRow, CCol, CCard, CCardHeader, CCardBody, 
  CForm, CFormInput, CButton, CAvatar, CSpinner, CAlert,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudUpload, cilSave, cilUser, cilPencil } from '@coreui/icons'
import { usersAPI } from '../../utils/api'
import '../../styles/Admin.css'

// [CONSISTENCY] Use the same library as ProductPage
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const ASSET_URL = 'http://localhost:5000'
const CROP_ASPECT = 1; // 1:1 Aspect Ratio is required for Avatars (Square)

// ==================================================================================
// SUB-COMPONENT: CROP MODAL (Branded)
// ==================================================================================
const ImageCropModal = ({ visible, imageSrc, onClose, onApply, loading }) => {
    const [crop, setCrop] = useState(undefined);
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    useEffect(() => { 
        if(visible) { setCrop(undefined); setCompletedCrop(null); }
    }, [visible]);

    const onImageLoad = useCallback((e) => {
        const { width, height } = e.currentTarget;
        imgRef.current = e.currentTarget;
        const initCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, CROP_ASPECT, width, height), 
            width, height
        );
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
        ctx.drawImage(
            imgRef.current, 
            completedCrop.x * scaleX, completedCrop.y * scaleY, 
            completedCrop.width * scaleX, completedCrop.height * scaleY, 
            0, 0, 
            completedCrop.width, completedCrop.height
        );
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
        onApply(blob);
    };

    return (
        <CModal visible={visible} onClose={onClose} size="lg" alignment="center" backdrop="static">
            <CModalHeader className="bg-brand-navy">
                <CModalTitle component="span" className="text-white" style={{fontFamily: 'Oswald', letterSpacing: '1px'}}>
                    ADJUST PROFILE PHOTO
                </CModalTitle>
            </CModalHeader>
            <CModalBody className="d-flex justify-content-center bg-dark p-0 overflow-hidden">
                {imageSrc && (
                    <div style={{maxHeight: '60vh'}}>
                        <ReactCrop 
                            crop={crop} 
                            onChange={c => setCrop(c)} 
                            onComplete={c => setCompletedCrop(c)} 
                            aspect={CROP_ASPECT}
                            circularCrop={true} 
                        >
                            <img src={imageSrc} alt="Crop" style={{ maxWidth: '100%', maxHeight: '60vh' }} crossOrigin="anonymous" onLoad={onImageLoad} />
                        </ReactCrop>
                    </div>
                )}
            </CModalBody>
            <CModalFooter className="bg-light border-top-0">
                <button className="btn btn-ghost-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" style={{backgroundColor: 'var(--brand-blue)'}} onClick={handleApply} disabled={loading || !completedCrop}>
                    {loading ? <CSpinner size="sm"/> : 'Apply & Save'}
                </button>
            </CModalFooter>
        </CModal>
    )
}

// ==================================================================================
// MAIN COMPONENT
// ==================================================================================
const ProfilePage = () => {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState({})
  
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [cropVisible, setCropVisible] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const fileInputRef = useRef(null)
  const userId = localStorage.getItem('userId') 

  // 1. Fetch Data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) { setLoading(false); return; }
      try {
        const res = await usersAPI.getById(userId) // Now this exists!
        if (res.success) {
          setUser(res.data)
          if (res.data.avatar) {
             setAvatarPreview(res.data.avatar.startsWith('http') ? res.data.avatar : `${ASSET_URL}${res.data.avatar}`)
          }
        }
      } catch (error) {
        console.error(error)
        setMessage({ type: 'danger', text: 'Failed to load profile data.' })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [userId])

  const handleChange = (e) => setUser({ ...user, [e.target.id]: e.target.value })
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader()
      reader.onloadend = () => { setCropSrc(reader.result); setCropVisible(true); }
      reader.readAsDataURL(e.target.files[0])
      e.target.value = ''
    }
  }

  const handleCropResult = (blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" })
    setSelectedFile(file)
    setAvatarPreview(URL.createObjectURL(blob))
    setCropVisible(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const formData = new FormData()
      formData.append('username', user.username || '')
      formData.append('first_name', user.first_name || '')
      formData.append('last_name', user.last_name || '')
      formData.append('email', user.email || '')
      if (selectedFile) formData.append('avatar', selectedFile)

      const res = await usersAPI.update(userId, formData)
      
      if (res.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        if (user.username) localStorage.setItem('username', user.username)
        if (res.avatar) localStorage.setItem('userAvatar', res.avatar)
        window.dispatchEvent(new Event('userUpdated'))
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to update profile.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center pt-5"><CSpinner color="primary"/></div>

  return (
    <div className="px-4 py-4">
      {/* Branding Header */}
      <div className="mb-4">
          <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald', letterSpacing: '1px'}}>MY PROFILE</h2>
          <div className="text-muted fw-semibold">Manage your account settings and preferences</div>
      </div>

      <CRow>
        <CCol xs={12}>
          {message.text && <CAlert color={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>{message.text}</CAlert>}
        </CCol>

        {/* Left Column: Avatar */}
        <CCol xs={12} md={4}>
          <CCard className="mb-4 shadow-sm border-0">
            <CCardHeader className="bg-transparent border-bottom-0 pt-3 pb-0">
              <h5 className="mb-0 text-brand-navy fw-bold" style={{fontFamily: 'Oswald'}}>PROFILE PICTURE</h5>
            </CCardHeader>
            <CCardBody className="text-center pb-5">
              <div className="mb-3 position-relative d-inline-block group-avatar" style={{cursor: 'pointer'}} onClick={() => fileInputRef.current.click()}>
                <CAvatar 
                  src={avatarPreview || undefined} 
                  color={!avatarPreview ? 'secondary' : undefined}
                  size="xl" 
                  style={{ width: '150px', height: '150px', fontSize: '3rem', objectFit: 'cover' }}
                  className="border border-4 border-white shadow-sm"
                >
                    {!avatarPreview && (user.username ? user.username.charAt(0).toUpperCase() : <CIcon icon={cilUser}/>)}
                </CAvatar>
                <div className="position-absolute bottom-0 end-0 bg-brand-navy rounded-circle p-2 shadow-sm border border-white" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <CIcon icon={cilPencil} className="text-white"/>
                </div>
              </div>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
              
              <h4 className="mb-1 text-brand-navy fw-bold mt-2" style={{fontFamily: 'Oswald'}}>{user.username || 'User'}</h4>
              <p className="text-muted mb-4 text-uppercase small ls-1 fw-bold">{user.role || 'Staff'}</p>
              
              <div className="d-grid gap-2 col-10 mx-auto">
                <CButton color="light" variant="ghost" className="text-muted" onClick={() => fileInputRef.current.click()}>
                  <CIcon icon={cilCloudUpload} className="me-2"/> Change Photo
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Right Column: Form */}
        <CCol xs={12} md={8}>
          <CCard className="mb-4 shadow-sm border-0">
            <CCardHeader className="bg-transparent border-bottom-0 pt-3 pb-0">
              <h5 className="mb-0 text-brand-navy fw-bold" style={{fontFamily: 'Oswald'}}>ACCOUNT DETAILS</h5>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3" onSubmit={handleSubmit}>
                <CCol md={6}>
                  <CFormInput id="first_name" label="First Name" value={user.first_name || ''} onChange={handleChange} className="bg-light border-0" style={{padding: '10px'}}/>
                </CCol>
                <CCol md={6}>
                  <CFormInput id="last_name" label="Last Name" value={user.last_name || ''} onChange={handleChange} className="bg-light border-0" style={{padding: '10px'}}/>
                </CCol>
                <CCol md={6}>
                  <CFormInput id="username" label="Display Name" value={user.username || ''} onChange={handleChange} className="bg-light border-0" style={{padding: '10px'}}/>
                </CCol>
                <CCol md={6}>
                  <CFormInput id="role" label="Role" value={user.role || ''} disabled className="bg-light border-0 opacity-50" style={{padding: '10px'}}/>
                </CCol>
                <CCol md={12}>
                  <CFormInput id="email" label="Email Address" type="email" value={user.email || ''} onChange={handleChange} className="bg-light border-0" style={{padding: '10px'}}/>
                </CCol>
                <CCol xs={12} className="mt-4 d-flex justify-content-end">
                  <button className="btn btn-primary px-4 text-white fw-bold d-flex align-items-center" style={{backgroundColor: 'var(--brand-blue)', border: 'none', padding: '10px 25px'}} disabled={submitting}>
                      {submitting ? <CSpinner size="sm" className="me-2"/> : <CIcon icon={cilSave} className="me-2"/>} SAVE CHANGES
                  </button>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <ImageCropModal visible={cropVisible} imageSrc={cropSrc} onClose={() => setCropVisible(false)} onApply={handleCropResult} loading={false} />
    </div>
  )
}

export default ProfilePage