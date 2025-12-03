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
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilMagnifyingGlass, cilPlus, cilPencil, cilTrash, cilImage, 
  cilCloudUpload, cilChevronLeft, cilChevronRight, cilBarcode,
  cilCrop 
} from '@coreui/icons'
import { productAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'

import ReactCrop, { centerCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

import '../../styles/App.css'
import '../../styles/ProductPage.css' 

const ASSET_URL = 'http://localhost:5000'

const UOM_OPTIONS = ['EA', 'SET', 'KIT', 'PR', 'ASY', 'PK']
const CROP_ASPECT = 4 / 3; 

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
  
  // CROP STATE
  const [cropModalVisible, setCropModalVisible] = useState(false)
  const [imageToCrop, setImageToCrop] = useState(null) 
  const [cropLoading, setCropLoading] = useState(false)
  const fileInputRef = useRef(null) 
  
  const [crop, setCrop] = useState(undefined);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnremovableSerials, setHasUnremovableSerials] = useState(false)
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })
  
  // Drag State
  const [isDragging, setIsDragging] = useState(false);

  const itemsPerPage = 10

  const didInit = useRef(false);

  // --- HELPERS ---
  const showMessage = (title, message, color = 'info', onConfirm = null) => {
    setMsgModal({ visible: true, title, message, color, onConfirm })
  }

  const getImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${ASSET_URL}${cleanPath}`
  }

  // Canvas Helper
  const canvasPreview = (image, crop) => {
    if (!crop || !image) return null;

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;

    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
    );

    return new Promise(resolve => {
        canvas.toBlob(blob => {
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
  }

  // --- DRAG HANDLERS ---
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(e.type === "dragenter" || e.type === "dragover");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const simulatedEvent = { target: { files: [file] } };
        handleSelectFile(simulatedEvent);
      } else {
        showMessage('Invalid File', 'Only image files can be dropped here.', 'danger');
      }
    }
  };

  // --- API & LIFECYCLE ---
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
    } catch (e) { console.error(e) } 
    finally { setLoading(false) }
  }, [currentPage, searchQuery, selectedCategory, selectedBrand, selectedStatus])

  const loadCategoriesAndBrands = useCallback(async () => {
    try {
      const catRes = await productAPI.getCategories()
      if (catRes.success) setCategories(catRes.data || [])
      const brandRes = await productAPI.getBrands()
      if (brandRes.success) setBrands(brandRes.data || [])
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    loadCategoriesAndBrands();
    const t = setTimeout(() => loadProducts(), 50);
    return () => clearTimeout(t);
  }, [loadCategoriesAndBrands, loadProducts]);

  // --- HANDLERS ---
  const handleAddProduct = () => {
    setIsAddMode(true)
    setHasUnremovableSerials(false);
    
    setImageToCrop(null);
    setCrop(undefined);
    setCompletedCrop(null);
    
    setSelectedProduct({
      name: '', brand: '', category: '', price: 0, status: 'Active',
      description: '', vehicle_compatibility: '', image: null, requires_serial: false,
      unit_tag: 'EA'
    })
    setSelectedImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setIsModalOpen(true)
  }

  const handleEditProduct = async (product) => {
    setIsAddMode(false)
    setHasUnremovableSerials(false);
    
    setImageToCrop(null);
    setCrop(undefined);
    setCompletedCrop(null);

    setSelectedProduct({ ...product, unit_tag: product.unit_tag || 'EA' })
    setSelectedImageFile(null)
    setImagePreview(getImageUrl(product.image))
    if (fileInputRef.current) fileInputRef.current.value = ""
    setIsModalOpen(true)
    
    if (product.requires_serial) {
      const res = await serialNumberAPI.getAllSerials(product.product_id)
      setHasUnremovableSerials(res.success && res.data.some(s => s.status === 'sold'))
    } else {
      setHasUnremovableSerials(false)
    }
  }
  
  const handleOpenCrop = () => {
      if (!imageToCrop && imagePreview) {
          setImageToCrop(imagePreview);
      }
      setCrop(undefined);
      setCompletedCrop(null);
      setCropModalVisible(true);
  }

  const onDeleteProduct = (product) => {
    const idToDelete = product.id || product.product_id;
    showMessage('Confirm Deletion', `Are you sure you want to permanently delete "${product.name}"?`, 'danger', async () => {
        setLoading(true);
        try {
            await productAPI.deleteProduct(idToDelete); 
            showMessage('Success', 'Product deleted successfully!', 'success');
            loadProducts();
        } catch (e) {
            showMessage('Error', e.message || 'Failed to delete product.', 'danger');
        } finally { setLoading(false); }
    });
  }

  const onImageLoad = useCallback((image) => {
    imgRef.current = image;
    const initialCrop = centerCrop(image.width, image.height, CROP_ASPECT);
    setCrop(initialCrop);
    setCompletedCrop(initialCrop); 
  }, []);
  
  const handleSelectFile = (e) => {
    const file = e.target.files[0]
    if (!file) return;
    setSelectedImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageToCrop(reader.result) 
      setCrop(undefined); 
      setCompletedCrop(null);
      setCropModalVisible(true)
    }
    reader.readAsDataURL(file)
  }
  
  const handleApplyCrop = async () => {
      if (!completedCrop || !imgRef.current) return showMessage('Error', 'Please define a crop area.', 'warning');
      setCropLoading(true);
      try {
          const image = imgRef.current;
          const croppedImageBlob = await canvasPreview(image, completedCrop);
          if (!croppedImageBlob) throw new Error("Image processing failed.");
          const croppedFile = new File([croppedImageBlob], selectedImageFile?.name || "cropped.jpg", { type: croppedImageBlob.type || 'image/jpeg' });
          if (imagePreview) URL.revokeObjectURL(imagePreview);
          setImagePreview(URL.createObjectURL(croppedImageBlob));
          setSelectedImageFile(croppedFile);
          setCropModalVisible(false);
          setCompletedCrop(null); 
          setCrop(undefined);
      } catch (e) { showMessage('Error', e.message || 'Image processing failed.', 'danger'); } 
      finally { setCropLoading(false); }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.keys(selectedProduct).forEach(key => {
        if (key === 'image') return; 
        if (selectedProduct[key] !== null && selectedProduct[key] !== undefined) {
          formData.append(key, selectedProduct[key])
        }
      })
      if (selectedImageFile) formData.append('image', selectedImageFile)
      else if (selectedProduct.image && typeof selectedProduct.image === 'string') formData.append('image', selectedProduct.image)

      const idToUpdate = isAddMode ? null : (selectedProduct.product_id || selectedProduct.id); 

      const apiCall = isAddMode 
        ? productAPI.createProduct(formData) 
        : productAPI.updateProduct(idToUpdate, formData)
      
      const res = await apiCall
      if (res.success) {
        showMessage('Success', isAddMode ? 'Product added to catalog' : 'Product updated', 'success')
        setIsModalOpen(false)
        loadProducts()
      } else { throw new Error(res.message) }
    } catch (e) { showMessage('Error', e.message, 'danger') } 
    finally { setIsSubmitting(false) }
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // --- UI RENDER ---
  return (
    <CContainer fluid>
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h2 className="fw-bold text-brand-navy" style={{fontFamily: 'Oswald, sans-serif'}}>PRODUCT CATALOG</h2>
          <div className="text-medium-emphasis">Manage system products and pricing</div>
        </div>
        <button className="btn-brand btn-brand-primary" onClick={handleAddProduct}>
          <CIcon icon={cilPlus} className="me-2" /> Add New Part
        </button>
      </div>

      {/* FILTERS & TABLE (Same as before) */}
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="bg-light rounded p-3">
            <CRow className="g-3">
            <CCol md={3}>
              <div className="brand-search-wrapper w-100">
                <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass} /></span>
                <input type="text" className="brand-search-input" placeholder="Search parts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
              </div>
            </CCol>
            <CCol md={3}>
              <select className="brand-select w-100" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option>All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </CCol>
            <CCol md={3}>
              <select className="brand-select w-100" value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                <option>All Brand</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
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
      
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="p-0">
          <div className="product-table-container">
            <table className="product-table table-hover w-100">
              <thead>
                <tr>
                  <th scope="col" className="ps-4" style={{width: '35%'}}>Part Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Brand</th>
                  <th scope="col">Retail Price</th>
                  <th scope="col" className="text-center">Status</th>
                  <th scope="col" className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5"><CSpinner color="primary" variant="grow"/><div className="text-muted mt-2">Loading catalog...</div></td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No products found</td></tr>
                ) : (
                  products.map(p => {
                    const imgUrl = getImageUrl(p.image)
                    return (
                      <tr key={p.id || p.product_id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-3">
                            {imgUrl ? (
                              <img src={imgUrl} alt={p.name} className="table-thumbnail" onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
                            ) : null}
                            <div className="placeholder-thumbnail" style={{display: imgUrl ? 'none' : 'flex'}}><CIcon icon={cilImage} className="text-secondary opacity-50"/></div>
                            <div>
                              <div className="fw-bold text-dark">{p.name}</div>
                              <small className="text-muted">{p.brand} • {p.product_id}</small>
                              {p.requires_serial && <CBadge color="info" shape="rounded-pill" className="ms-2" style={{fontSize: '0.65rem'}}>SN</CBadge>}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border fw-normal">{p.category}</span></td>
                        <td>{p.brand}</td>
                        <td className="fw-bold text-primary">₱{p.price?.toLocaleString()} <span className="text-muted small fw-normal">({p.unit_tag || 'EA'})</span></td>
                        <td className="text-center"><span className={`status-badge ${p.status === 'Active' ? 'active' : 'inactive'}`}>{p.status}</span></td>
                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => handleEditProduct(p)} title="Edit"><CIcon icon={cilPencil} /></button>
                            <button className="btn-brand btn-brand-danger btn-brand-sm" onClick={() => onDeleteProduct(p)} title="Delete"><CIcon icon={cilTrash} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-light">
            <span className="text-muted small">Showing {products.length} of {totalItems} items</span>
            <div className="d-flex gap-2 align-items-center">
              <button className="btn-brand btn-brand-outline btn-brand-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><CIcon icon={cilChevronLeft} /> Prev</button>
              <span className="small fw-bold px-2">{currentPage} / {totalPages || 1}</span>
              <button className="btn-brand btn-brand-outline btn-brand-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next <CIcon icon={cilChevronRight} /></button>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* ADD/EDIT MODAL */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" alignment="center" backdrop="static">
        <CModalHeader><CModalTitle className="fw-bold text-uppercase">{isAddMode ? 'Add New Part' : 'Edit Part Details'}</CModalTitle></CModalHeader>
        <CModalBody>
          <div className="vertical-product-form">
            
            <h6 className="fw-bold text-brand-navy mb-3 border-bottom pb-2">1. Part Identification & Specs</h6>
            <CRow className="g-3 mb-4">
              <CCol md={12}>
                  <CFormLabel>Part Name / Description <span className="text-danger">*</span></CFormLabel>
                  <CFormInput value={selectedProduct?.name || ''} onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})} placeholder="e.g. Brake Pad Set (Front)" />
              </CCol>
              <CCol md={6}>
                  <CFormLabel>Brand / Manufacturer</CFormLabel>
                  <CFormSelect value={selectedProduct?.brand || ''} onChange={e => setSelectedProduct({...selectedProduct, brand: e.target.value})} className="brand-select">
                     <option value="">Select Brand</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
                  </CFormSelect>
              </CCol>
              <CCol md={6}>
                  <CFormLabel>Vehicle Application (Fits)</CFormLabel>
                  <CFormInput 
                    value={selectedProduct?.vehicle_compatibility || ''} 
                    onChange={e => setSelectedProduct({...selectedProduct, vehicle_compatibility: e.target.value})} 
                    placeholder="e.g. Toyota Vios 2019+, Honda City"
                  />
              </CCol>
              <CCol md={12}>
                  <CFormLabel>Detailed Description</CFormLabel>
                  <CFormTextarea rows={2} value={selectedProduct?.description || ''} onChange={e => setSelectedProduct({...selectedProduct, description: e.target.value})} placeholder="Additional specs, part numbers, etc." />
              </CCol>
            </CRow>

            <h6 className="fw-bold text-brand-navy mb-3 border-bottom pb-2">2. Pricing & Packaging</h6>
            <CRow className="g-3 mb-4">
              <CCol md={4}>
                  <CFormLabel>Category</CFormLabel>
                  <CFormSelect value={selectedProduct?.category || ''} onChange={e => setSelectedProduct({...selectedProduct, category: e.target.value})} className="brand-select">
                     <option value="">Select Category</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </CFormSelect>
              </CCol>
              <CCol md={4}>
                {/* [FIX] Added w-100 to custom select */}
                <CFormLabel>Unit</CFormLabel>
                <select 
                  className="brand-select w-100" 
                  value={selectedProduct?.unit_tag || 'EA'} 
                  onChange={e => setSelectedProduct({...selectedProduct, unit_tag: e.target.value})}
                >
                    {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </CCol>
              <CCol md={4}>
                  <CFormLabel>Retail Price (₱)</CFormLabel>
                  <CFormInput type="number" min="0" step="100" value={selectedProduct?.price || ''} 
                    onChange={e => setSelectedProduct({...selectedProduct, price: e.target.value})} 
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setSelectedProduct(prev => ({ ...prev, price: Math.round(val / 100) * 100 }));
                    }}
                  />
              </CCol>
            </CRow>

            <h6 className="fw-bold text-brand-navy mb-3 border-bottom pb-2">3. Visuals & System Control</h6>
            <CRow className="g-3">
               <CCol md={6} className="d-flex flex-column align-items-center">
                  <CFormLabel className="small text-muted fw-bold mb-2">PART IMAGE</CFormLabel>
                  <div 
                      className="image-upload-preview mb-2 d-flex flex-column align-items-center justify-content-center" 
                      style={{ 
                        width: '100%', maxWidth: '220px', aspectRatio: '4/3',
                        border: isDragging ? '3px dashed var(--brand-blue)' : '2px dashed #ccc',
                        transition: 'border 0.2s', cursor: 'pointer'
                      }} 
                      onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                  >
                      {imagePreview ? <img src={imagePreview} alt="Preview" style={{ objectFit: 'cover', width: '100%', height: '100%' }} /> : 
                        <div className="text-center text-muted p-3"><CIcon icon={cilCloudUpload} size="xl"/><div className="small mt-1">Drop or Click</div></div>
                      }
                  </div>
                  <input type="file" accept="image/*" onChange={handleSelectFile} ref={fileInputRef} style={{ display: 'none' }} />
                  {(imagePreview || selectedImageFile) && (
                      <CButton color="info" variant="ghost" size="sm" onClick={handleOpenCrop}>
                          <CIcon icon={cilCrop} className="me-1"/> Adjust Crop
                      </CButton>
                  )}
               </CCol>
               <CCol md={6}>
                  <div className="p-3 bg-light border rounded h-100 d-flex flex-column justify-content-center gap-3">
                      <CFormSwitch label="Track Serial Numbers" checked={selectedProduct?.requires_serial || false} disabled={hasUnremovableSerials} onChange={e => setSelectedProduct({...selectedProduct, requires_serial: e.target.checked})} />
                      <CFormSwitch label="Active in Catalog" checked={selectedProduct?.status === 'Active'} onChange={e => setSelectedProduct({...selectedProduct, status: e.target.checked ? 'Active' : 'Inactive'})} />
                  </div>
               </CCol>
            </CRow>

          </div>
        </CModalBody>
        <CModalFooter>
          <button className="btn-brand btn-brand-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button className="btn-brand btn-brand-primary" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? <CSpinner size="sm" /> : 'Save Part'}</button>
        </CModalFooter>
      </CModal>

      {/* CROP MODAL */}
      <CModal visible={cropModalVisible} onClose={() => setCropModalVisible(false)} size="lg" alignment="center" backdrop="static">
        <CModalHeader><CModalTitle>Adjust Image Crop</CModalTitle></CModalHeader>
        <CModalBody className="d-flex justify-content-center bg-dark">
             {/* Added crossOrigin for backend images */}
             {imageToCrop && (
                <div style={{width: '100%', maxWidth: '600px'}}>
                     <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} onImageLoad={onImageLoad} aspect={CROP_ASPECT}>
                        <img ref={imgRef} src={imageToCrop} alt="Crop" style={{ width: '100%', height: 'auto' }} crossOrigin="anonymous" />
                     </ReactCrop>
                </div>
             )}
        </CModalBody>
        <CModalFooter>
           <CButton color="secondary" onClick={() => setCropModalVisible(false)}>Cancel</CButton>
           <CButton color="success" className="text-white" onClick={handleApplyCrop} disabled={cropLoading || !completedCrop}>{cropLoading ? <CSpinner size="sm"/> : 'Apply Crop'}</CButton>
        </CModalFooter>
      </CModal>

      {/* MSG MODAL */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter>
            {msgModal.onConfirm ? (
                <CButton color={msgModal.color} className="text-white" onClick={() => { msgModal.onConfirm(); setMsgModal(p => ({ ...p, visible: false })) }}>Confirm</CButton>
            ) : (
                <CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton>
            )}
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default ProductPage