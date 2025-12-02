import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CButton, CFormInput, CFormSelect,
  CFormLabel, CFormTextarea, CFormSwitch, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CBadge, CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilMagnifyingGlass, cilPlus, cilPencil, cilTrash, cilImage, 
  cilCloudUpload, cilChevronLeft, cilChevronRight, cilBarcode
} from '@coreui/icons'
import { productAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'

// [FIX] Import Global Brand Styles
import '../../styles/App.css'
import '../../styles/ProductPage.css' 

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

  // --- API ---
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
        showMessage('Success', isAddMode ? 'Product created successfully' : 'Product updated successfully', 'success')
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

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <CContainer fluid>
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h2 className="fw-bold text-brand-navy mb-0" style={{fontFamily: 'Oswald, sans-serif'}}>PRODUCT CATALOG</h2>
          <div className="text-medium-emphasis">Manage system products and pricing</div>
        </div>
        {/* [FIX] Branded Primary Button */}
        <button className="btn-brand btn-brand-primary" onClick={handleAddProduct}>
          <CIcon icon={cilPlus} className="me-2" /> Add Product
        </button>
      </div>

      {/* FILTERS */}
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="bg-light rounded p-3">
          <CRow className="g-3">
            <CCol md={3}>
              {/* [FIX] Branded Search Bar */}
              <div className="brand-search-wrapper w-100">
                <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass} /></span>
                <input 
                  type="text" 
                  className="brand-search-input" 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </CCol>
            
            {/* [FIX] Branded Dropdowns - Using Native <select> for perfect height match */}
            <CCol md={3}>
              <select className="brand-select w-100" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option>All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </CCol>
            <CCol md={3}>
              <select className="brand-select w-100" value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                <option>All Brand</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </CCol>
            <CCol md={3}>
              <select className="brand-select w-100" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option>All Status</option><option>Active</option><option>Inactive</option>
              </select>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* MAIN TABLE */}
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="p-0">
          
          <div className="product-table-container">
            <table className="product-table table-hover w-100">
              <thead>
                <tr>
                  <th scope="col" className="ps-4" style={{width: '35%'}}>Product Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Brand</th>
                  <th scope="col">Price</th>
                  <th scope="col" className="text-center">Status</th>
                  <th scope="col" className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <CSpinner color="primary" variant="grow"/>
                      <div className="text-muted mt-2">Loading catalog...</div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No products found</td></tr>
                ) : (
                  products.map(p => {
                    const imgUrl = getImageUrl(p.image)
                    return (
                      <tr key={p.product_id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-3">
                            {/* Thumbnail Logic */}
                            {imgUrl ? (
                              <img src={imgUrl} alt={p.name} className="table-thumbnail" onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
                            ) : null}
                            
                            <div className="placeholder-thumbnail" style={{display: imgUrl ? 'none' : 'flex'}}>
                              <CIcon icon={cilImage} className="text-secondary opacity-50"/>
                            </div>
                            
                            <div>
                              <div className="fw-bold text-dark">{p.name}</div>
                              <small className="text-muted">ID: {p.product_id}</small>
                              {p.requires_serial && (
                                <CBadge color="info" shape="rounded-pill" className="ms-2" style={{fontSize: '0.65rem'}}>
                                  <CIcon icon={cilBarcode} size="sm" className="me-1"/> SN
                                </CBadge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border fw-normal">{p.category}</span></td>
                        <td>{p.brand}</td>
                        <td className="fw-bold text-primary">₱{p.price?.toLocaleString()}</td>
                        <td className="text-center">
                          <span className={`status-badge ${p.status === 'Active' ? 'active' : 'inactive'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-2">
                            {/* [FIX] Small Branded Buttons inside Table */}
                            <button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => handleEditProduct(p)} title="Edit">
                              <CIcon icon={cilPencil} />
                            </button>
                            <button className="btn-brand btn-brand-danger btn-brand-sm" onClick={() => showMessage('Delete', 'Delete functionality placeholder', 'warning')} title="Delete">
                              <CIcon icon={cilTrash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-light">
            <span className="text-muted small">
              Showing {products.length} of {totalItems} items
            </span>
            <div className="d-flex gap-2 align-items-center">
              <button 
                className="btn-brand btn-brand-outline btn-brand-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <CIcon icon={cilChevronLeft} /> Prev
              </button>
              <span className="small fw-bold px-2">{currentPage} / {totalPages || 1}</span>
              <button 
                className="btn-brand btn-brand-outline btn-brand-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <CIcon icon={cilChevronRight} />
              </button>
            </div>
          </div>

        </CCardBody>
      </CCard>

      {/* MODALS (Retain CoreUI styles for Form Controls inside modal for now, or update if desired) */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" alignment="center">
        <CModalHeader><CModalTitle className="fw-bold">{isAddMode ? 'Add New Product' : 'Edit Product Details'}</CModalTitle></CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={4} className="d-flex flex-column align-items-center">
              <div className="image-upload-preview">
                {imagePreview ? <img src={imagePreview} alt="Preview" /> : <div className="text-center text-muted"><CIcon icon={cilCloudUpload} size="3xl" className="mb-2 text-secondary"/><small className="d-block">Upload Image</small></div>}
              </div>
              <div className="w-100"><CFormInput type="file" accept="image/*" size="sm" onChange={handleFileChange} /></div>
            </CCol>
            <CCol md={8}>
              <CRow className="g-3">
                <CCol md={12}><CFormLabel>Product Name <span className="text-danger">*</span></CFormLabel><CFormInput value={selectedProduct?.name || ''} onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})} /></CCol>
                <CCol md={6}><CFormLabel>Brand</CFormLabel><CFormSelect value={selectedProduct?.brand || ''} onChange={e => setSelectedProduct({...selectedProduct, brand: e.target.value})}><option value="">Select Brand</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}</CFormSelect></CCol>
                <CCol md={6}><CFormLabel>Category</CFormLabel><CFormSelect value={selectedProduct?.category || ''} onChange={e => setSelectedProduct({...selectedProduct, category: e.target.value})}><option value="">Select Category</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</CFormSelect></CCol>
                <CCol md={6}><CFormLabel>Price (₱)</CFormLabel><CFormInput type="number" min="0" value={selectedProduct?.price || ''} onChange={e => setSelectedProduct({...selectedProduct, price: e.target.value})} /></CCol>
                <CCol md={12}><CFormLabel>Description</CFormLabel><CFormTextarea rows={3} value={selectedProduct?.description || ''} onChange={e => setSelectedProduct({...selectedProduct, description: e.target.value})} /></CCol>
              </CRow>
            </CCol>
            <CCol md={12} className="border-top pt-3 mt-3">
               <div className="d-flex justify-content-between">
                  <CFormSwitch label="Requires Serial Number" checked={selectedProduct?.requires_serial || false} disabled={hasUnremovableSerials} onChange={e => setSelectedProduct({...selectedProduct, requires_serial: e.target.checked})} />
                  <CFormSwitch label="Active Status" checked={selectedProduct?.status === 'Active'} onChange={e => setSelectedProduct({...selectedProduct, status: e.target.checked ? 'Active' : 'Inactive'})} />
               </div>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <button className="btn-brand btn-brand-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button className="btn-brand btn-brand-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <CSpinner size="sm" /> : 'Save Product'}
          </button>
        </CModalFooter>
      </CModal>

      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default ProductPage