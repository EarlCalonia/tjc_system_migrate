import React from 'react'
import { 
  CRow, CCol, CCard, CCardHeader, CCardBody, 
  CForm, CFormInput, CButton, CAvatar 
} from '@coreui/react'
import avatar8 from '../../assets/images/avatars/8.jpg' // Make sure this path matches your assets

const ProfilePage = () => {
  return (
    <CRow>
      {/* Left Column: Avatar & Quick Actions */}
      <CCol xs={12} md={4}>
        <CCard className="mb-4 shadow-sm border-0">
          <CCardHeader className="bg-transparent border-bottom-0 pt-3 pb-0">
            <h5 className="mb-0 text-gray-800">My Profile</h5>
          </CCardHeader>
          <CCardBody className="text-center pb-5">
            <div className="mb-3 position-relative d-inline-block">
              <CAvatar src={avatar8} size="xl" style={{ width: '120px', height: '120px' }} />
              <span 
                className="position-absolute bottom-0 end-0 bg-success border border-light rounded-circle p-2"
                style={{ width: '20px', height: '20px' }}
                title="Active"
              ></span>
            </div>
            <h4 className="mb-1">John Doe</h4>
            <p className="text-medium-emphasis mb-4">Super Administrator</p>
            
            <div className="d-grid gap-2 col-10 mx-auto">
              <CButton color="primary" variant="outline">
                Change Avatar
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      {/* Right Column: Account Details Form */}
      <CCol xs={12} md={8}>
        <CCard className="mb-4 shadow-sm border-0">
          <CCardHeader className="bg-transparent border-bottom-0 pt-3 pb-0">
            <h5 className="mb-0 text-gray-800">Account Details</h5>
          </CCardHeader>
          <CCardBody>
            <CForm className="row g-3">
              <CCol md={6}>
                <CFormInput id="firstName" label="First Name" defaultValue="John" />
              </CCol>
              <CCol md={6}>
                <CFormInput id="lastName" label="Last Name" defaultValue="Doe" />
              </CCol>
              <CCol md={6}>
                <CFormInput id="phone" label="Phone Number" defaultValue="+63 912 345 6789" />
              </CCol>
              <CCol md={6}>
                <CFormInput id="role" label="Role" defaultValue="Administrator" disabled />
              </CCol>
              <CCol md={12}>
                <CFormInput id="email" label="Email Address" type="email" defaultValue="admin@tjcaus.com" disabled />
                <div className="form-text text-muted">Email address cannot be changed without admin approval.</div>
              </CCol>
              
              <CCol xs={12} className="mt-4 text-end">
                <CButton color="primary" type="submit">Save Changes</CButton>
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ProfilePage