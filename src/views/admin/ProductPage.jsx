import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormTextarea,
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
import { 
  cilMagnifyingGlass, 
  cilPlus, 
  cilPencil, 
  cilTrash, 
  cilImage, 
  cilCloudUpload,
  cilChevronLeft,
  cilChevronRight
} from '@coreui/icons'
import { productAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'

// --- CONFIGURATION ---
const ASSET_URL = 'http://localhost:5000'

const ProductPage = () => {
  // --- STATE ---
  const [products, setProducts] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [selectedBrand, setSelectedBrand] = useState('All Brand')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnremovableSerials, setHasUnremovableSerials] = useState(false)
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  const itemsPerPage = 10

  // --- HELPERS ---
  const showMessage = (title, message, color = 'info') => {
    setMsgModal({ visible: true, title, message, color })
  }

  const getImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${ASSET_URL}${cleanPath}`
  }

  // --- API CALLS (Wrapped in useCallback to fix linter) ---
  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const filters = { page: currentPage, limit: itemsPerPage }
      if (searchQuery) filters.search = searchQuery
      if (selectedCategory !== 'All Categories') filters.category = selectedCategory
      if (selectedBrand !== 'All Brand') filters.brand = selectedBrand
      if (selectedStatus !== 'All Status') filters.status = selectedStatus

      const res = await productAPI.getProducts(filters)
      if (res.success) {
        setProducts(res.data.products || [])
        setTotalItems(res.data.pagination?.totalProducts || res.data.total || 0)
      }
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoading(false) 
    }
  }, [currentPage, searchQuery, selectedCategory, selectedBrand, selectedStatus])

  const loadCategoriesAndBrands = useCallback(async () => {
    try {
      const catRes = await productAPI.getCategories()
      if (catRes.success) setCategories(catRes.data || [])
      const brandRes = await productAPI.getBrands()
      if (brandRes.success) setBrands(brandRes.data || [])
    } catch (e) { console.error(e) }
  }, [])

  // --- EFFECTS ---
  const didInit = useRef(false)
  
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    loadCategoriesAndBrands()
  }, [loadCategoriesAndBrands])

  useEffect(() => {
    const t = setTimeout(() => loadProducts(), 300)
    return () => clearTimeout(t)
  }, [loadProducts])

  // --- HANDLERS ---
  const handleAddProduct = () => {
    setIsAddMode(true)
    setSelectedProduct({
      name: '', brand: '', category: '', price: 0, status: 'Active',
      description: '', vehicle_compatibility: '', image: null, requires_serial: false
    })
    setSelectedImageFile(null)
    setImagePreview(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = async (product) => {
    setIsAddMode(false)
    setSelectedProduct({ ...product })
    setSelectedImageFile(null)
    setImagePreview(getImageUrl(product.image))
    setIsModalOpen(true)
    
    if (product.requires_serial) {
      const res = await serialNumberAPI.getAllSerials(product.product_id)
      setHasUnremovableSerials(res.success && res.data.some(s => s.status === 'sold'))
    } else {
      setHasUnremovableSerials(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.keys(selectedProduct).forEach(key => {
        if (key !== 'image' && selectedProduct[key] !== null) {
          formData.append(key, selectedProduct[key])
        }
      })
      if (selectedImageFile) {
        formData.append('image', selectedImageFile)
      }

      const apiCall = isAddMode 
        ? productAPI.createProduct(formData) 
        : productAPI.updateProduct(selectedProduct.product_id, formData)
      
      const res = await apiCall
      if (res.success) {
        showMessage('Success', isAddMode ? 'Product created' : 'Product updated', 'success')
        setIsModalOpen(false)
        loadProducts()
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      showMessage('Error', e.message, 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pagination Calculation
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <CContainer fluid>
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h2 className="fw-bold text-dark">Products</h2>
          <div className="text-medium-emphasis">Manage catalog items</div>
        </div>
        <CButton color="primary" className="text-white" onClick={handleAddProduct}>
          <CIcon icon={cilPlus} className="me-2" /> Add Product
        </CButton>
      </div>

      {/* FILTERS */}
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="bg-light rounded">
          <CRow className="g-3">
            <CCol md={3}>
              <CInputGroup>
                <CInputGroupText className="bg-white border-end-0"><CIcon icon={cilMagnifyingGlass} /></CInputGroupText>
                <CFormInput className="border-start-0" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </CInputGroup>
            </CCol>
            <CCol md={3}>
              <CFormSelect value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option>All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormSelect value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                <option>All Brand</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormSelect value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option>All Status</option><option>Active</option><option>Inactive</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* TABLE */}
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light border-bottom">
                <tr>
                  <th className="ps-4" style={{width: '35%'}}>Product</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th className="text-center">Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">Loading products...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No products found</td></tr>
                ) : (
                  products.map(p => {
                    const imgUrl = getImageUrl(p.image)
                    return (
                      <tr key={p.product_id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-3">
                            {/* Thumbnail */}
                            <div style={{
                              width: '48px', height: '48px', flexShrink: 0, 
                              borderRadius: '8px', border: '1px solid #e9ecef', 
                              overflow: 'hidden', backgroundColor: '#f8f9fa',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {imgUrl ? (
                                <img 
                                  src={imgUrl} 
                                  alt={p.name} 
                                  style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                                  onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} 
                                />
                              ) : null}
                              <div style={{display: imgUrl ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center'}}>
                                <CIcon icon={cilImage} size="lg" className="text-secondary opacity-25"/>
                              </div>
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{p.name}</div>
                              <small className="text-muted">ID: {p.product_id}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border">{p.category}</span></td>
                        <td>{p.brand}</td>
                        <td className="fw-semibold text-primary">₱{p.price?.toLocaleString()}</td>
                        <td className="text-center">
                          <CBadge color={p.status === 'Active' ? 'success' : 'secondary'} shape="rounded-pill">
                            {p.status}
                          </CBadge>
                        </td>
                        <td className="text-end pe-4">
                          <CButton size="sm" color="info" variant="ghost" onClick={() => handleEditProduct(p)}>
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton size="sm" color="danger" variant="ghost" onClick={() => showMessage('Delete', 'Delete functionality placeholder', 'warning')}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <span className="text-medium-emphasis small">
              Showing {products.length} of {totalItems} products
            </span>
            <div className="d-flex gap-2 align-items-center">
              <CButton 
                size="sm" 
                variant="outline" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <CIcon icon={cilChevronLeft} /> Prev
              </CButton>
              <span className="small fw-bold">Page {currentPage} of {totalPages || 1}</span>
              <CButton 
                size="sm" 
                variant="outline" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <CIcon icon={cilChevronRight} />
              </CButton>
            </div>
          </div>

        </CCardBody>
      </CCard>

      {/* PRODUCT MODAL */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" alignment="center">
        <CModalHeader>
          <CModalTitle>{isAddMode ? 'Add Product' : 'Edit Product'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12} className="d-flex flex-column align-items-center mb-3">
              <div 
                className="mb-3 position-relative"
                style={{
                  width: '150px', height: '150px', 
                  borderRadius: '12px', border: '2px dashed #ced4da',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#f8f9fa'
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <div className="text-center text-muted">
                    <CIcon icon={cilCloudUpload} size="3xl" className="mb-2"/>
                    <small className="d-block">No Image</small>
                  </div>
                )}
              </div>
              <div className="w-100" style={{maxWidth: '300px'}}>
                <CFormInput type="file" accept="image/*" onChange={handleFileChange} />
              </div>
            </CCol>

            <CCol md={6}>
              <CFormLabel>Product Name</CFormLabel>
              <CFormInput value={selectedProduct?.name || ''} onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})} />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Brand</CFormLabel>
              <CFormSelect value={selectedProduct?.brand || ''} onChange={e => setSelectedProduct({...selectedProduct, brand: e.target.value})}>
                <option value="">Select...</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Category</CFormLabel>
              <CFormSelect value={selectedProduct?.category || ''} onChange={e => setSelectedProduct({...selectedProduct, category: e.target.value})}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Price (₱)</CFormLabel>
              <CFormInput type="number" value={selectedProduct?.price || ''} onChange={e => setSelectedProduct({...selectedProduct, price: e.target.value})} />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea rows={3} value={selectedProduct?.description || ''} onChange={e => setSelectedProduct({...selectedProduct, description: e.target.value})} />
            </CCol>
            <CCol md={6}>
              <CFormSwitch 
                label="Requires Serial Number" 
                checked={selectedProduct?.requires_serial || false} 
                disabled={hasUnremovableSerials}
                onChange={e => setSelectedProduct({...selectedProduct, requires_serial: e.target.checked})} 
              />
            </CCol>
            <CCol md={6}>
              <CFormSwitch 
                label="Active Status" 
                checked={selectedProduct?.status === 'Active'} 
                onChange={e => setSelectedProduct({...selectedProduct, status: e.target.checked ? 'Active' : 'Inactive'})} 
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setIsModalOpen(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default ProductPage