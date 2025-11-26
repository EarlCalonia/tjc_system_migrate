import React, { useState, useEffect, useRef } from 'react'
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
import { cilMagnifyingGlass, cilPlus, cilPencil, cilTrash, cilTags } from '@coreui/icons'
import { productAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'

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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnremovableSerials, setHasUnremovableSerials] = useState(false)

  // Message Modal
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  const itemsPerPage = 10

  // --- INIT ---
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    loadProducts()
    loadCategoriesAndBrands()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadProducts(), 300)
    return () => clearTimeout(t)
  }, [searchQuery, selectedCategory, selectedBrand, selectedStatus, currentPage])

  // --- API ---
  const loadProducts = async () => {
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
  }

  const loadCategoriesAndBrands = async () => {
    try {
      const catRes = await productAPI.getCategories()
      if (catRes.success) setCategories(catRes.data || [])
      const brandRes = await productAPI.getBrands()
      if (brandRes.success) setBrands(brandRes.data || [])
    } catch (e) { console.error(e) }
  }

  // --- HANDLERS ---
  const showMessage = (title, message, color = 'info') => {
    setMsgModal({ visible: true, title, message, color })
  }

  const handleAddProduct = () => {
    setIsAddMode(true)
    setSelectedProduct({
      name: '', brand: '', category: '', price: 0, status: 'Active',
      description: '', vehicle_compatibility: '', image: null, requires_serial: false
    })
    setIsModalOpen(true)
  }

  const handleEditProduct = async (product) => {
    setIsAddMode(false)
    setSelectedProduct({ ...product })
    setIsModalOpen(true)
    
    if (product.requires_serial) {
        const res = await serialNumberAPI.getAllSerials(product.product_id)
        if (res.success && res.data.some(s => s.status === 'sold')) {
            setHasUnremovableSerials(true)
        } else {
            setHasUnremovableSerials(false)
        }
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.keys(selectedProduct).forEach(key => {
        if (selectedProduct[key] !== null) formData.append(key, selectedProduct[key])
      })

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

  // --- RENDER ---
  return (
    <CContainer fluid>
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h2>Products</h2>
          <div className="text-medium-emphasis">Manage catalog items</div>
        </div>
        <CButton color="primary" onClick={handleAddProduct}>
          <CIcon icon={cilPlus} className="me-2" /> Add Product
        </CButton>
      </div>

      {/* FILTERS */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3">
            <CCol md={3}>
              <CInputGroup>
                <CInputGroupText><CIcon icon={cilMagnifyingGlass} /></CInputGroupText>
                <CFormInput 
                  placeholder="Search..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
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
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* TABLE */}
      <CCard className="mb-4">
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>ID</CTableHeaderCell>
                <CTableHeaderCell>Name</CTableHeaderCell>
                <CTableHeaderCell>Category</CTableHeaderCell>
                <CTableHeaderCell>Brand</CTableHeaderCell>
                <CTableHeaderCell>Price</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? <CTableRow><CTableDataCell colSpan="7" className="text-center py-4">Loading...</CTableDataCell></CTableRow> : 
               products.map(p => (
                <CTableRow key={p.product_id}>
                  <CTableDataCell>{p.product_id}</CTableDataCell>
                  <CTableDataCell className="fw-bold">{p.name}</CTableDataCell>
                  <CTableDataCell><CBadge color="secondary" shape="rounded-pill">{p.category}</CBadge></CTableDataCell>
                  <CTableDataCell>{p.brand}</CTableDataCell>
                  <CTableDataCell>₱{p.price?.toLocaleString()}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={p.status === 'Active' ? 'success' : 'secondary'}>{p.status}</CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton size="sm" color="info" variant="ghost" onClick={() => handleEditProduct(p)}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton size="sm" color="danger" variant="ghost" onClick={() => showMessage('Delete', 'Delete functionality placeholder', 'warning')}>
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
          
          {/* Pagination Controls Placeholder - Reuse logic from InventoryPage */}
        </CCardBody>
      </CCard>

      {/* PRODUCT MODAL */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{isAddMode ? 'Add Product' : 'Edit Product'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormLabel>Name</CFormLabel>
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
              <CFormLabel>Price</CFormLabel>
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
          <CButton color="primary" onClick={handleSubmit} disabled={isSubmitting}>Save</CButton>
        </CModalFooter>
      </CModal>

      {/* GENERIC MESSAGE MODAL */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default ProductPage;