import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CCardHeader, CButton, CFormInput, CFormSelect, CFormLabel,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CSpinner, 
  CBadge, CTooltip, CPagination, CPaginationItem, CFormCheck, CFormTextarea
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass, cilPencil, cilInbox, cilCheckCircle, cilWarning, cilXCircle, 
  cilList, cilPlus, cilImage, cilBarcode, cilTrash, cilTruck, cilChevronLeft, 
  cilChevronRight, cilChevronBottom, cilMinus, cilArrowThickFromRight, cilDescription, cilSave
} from '@coreui/icons'
// [UPDATED] Added productAPI to imports
import { inventoryAPI, serialNumberAPI, suppliersAPI, productAPI } from '../../utils/api'

// Import Global Brand Styles
import '../../styles/Admin.css'
import '../../styles/App.css' 

const ASSET_URL = 'http://localhost:5000'
const ITEMS_PER_PAGE = 10; 

// --- REUSABLE STAT CARD ---
const StatCard = ({ title, value, icon, gradient, textColor = 'text-white' }) => (
  <CCard className="h-100 border-0 shadow-sm overflow-hidden" style={{ background: gradient }}>
    <CCardBody className="p-4 position-relative d-flex flex-column justify-content-between">
      <div className="position-absolute" style={{ top: '-10px', right: '-15px', opacity: 0.15, transform: 'rotate(15deg)' }}>
         {React.cloneElement(icon, { height: 100, width: 100, className: textColor })}
      </div>
      <div className="position-relative z-1">
        <div className={`text-uppercase fw-bold small mb-2 ${textColor}`} style={{ opacity: 0.8, letterSpacing: '1px' }}>{title}</div>
        <div className={`fw-bold ${textColor}`} style={{ fontSize: '2rem', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
      </div>
    </CCardBody>
  </CCard>
);

const InventoryPage = () => {
  // --- STATE ---
  const [products, setProducts] = useState([])
  const [suppliersList, setSuppliersList] = useState([])
  const [inventoryStats, setInventoryStats] = useState({ totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
  
  // [NEW] Stable Filter Options
  const [categoryOptions, setCategoryOptions] = useState([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingSerials, setLoadingSerials] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedType, setSelectedType] = useState('All') 
  
  // --- UNIFIED STOCK IN STATE ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [manifestItems, setManifestItems] = useState([]) 
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [searchedProducts, setSearchedProducts] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false) 
  const [selectedManifestProduct, setSelectedManifestProduct] = useState(null)
  
  // Supplier Combobox
  const [globalSupplierId, setGlobalSupplierId] = useState('')
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const [filteredSuppliers, setFilteredSuppliers] = useState([])

  // Form State
  const [itemForm, setItemForm] = useState({ quantity: 1, serials: [] })
  const [serialInput, setSerialInput] = useState('')
  const serialInputRef = useRef(null)
  const searchWrapperRef = useRef(null)
  const supplierWrapperRef = useRef(null)

  // Sub-Modals
  const [checkManifestSnModal, setCheckManifestSnModal] = useState({ open: false, items: [], productName: '' })
  const [viewSerialsModal, setViewSerialsModal] = useState({ open: false, product: null, serials: [] })
  const [editModal, setEditModal] = useState({ open: false, product: null, reorderPoint: 10 })
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })

  // --- RETURN TO SUPPLIER STATE ---
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnProduct, setReturnProduct] = useState(null)
  const [returnableSerials, setReturnableSerials] = useState([])
  const [returnForm, setReturnForm] = useState({
      supplierId: '',
      quantity: 1,
      selectedSerials: [], 
      reason: 'Defective/Damaged',
      notes: ''
  })

  const brandHeaderStyle = { fontFamily: 'Oswald, sans-serif', letterSpacing: '1px' };

  // --- LIFECYCLE ---
  useEffect(() => { 
      loadInventoryStats(); 
      loadSuppliers(); 
      loadFilterOptions(); // [NEW] Load categories once on mount
  }, [])

  useEffect(() => {
     const t = setTimeout(() => { loadProducts(); }, 300);
     return () => clearTimeout(t);
  }, [currentPage, searchQuery, selectedCategory, selectedStatus, selectedType]); 

  // Click Outside Handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (supplierWrapperRef.current && !supplierWrapperRef.current.contains(event.target)) {
        setShowSupplierSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Product Search Debounce
  useEffect(() => {
    if (selectedManifestProduct && productSearchTerm === selectedManifestProduct.name) return;

    const t = setTimeout(async () => {
        if (productSearchTerm || showSuggestions) {
            fetchProductSuggestions(productSearchTerm);
        }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearchTerm]);

  // Filter Suppliers
  useEffect(() => {
    if (!supplierSearchTerm) {
        setFilteredSuppliers(suppliersList);
    } else {
        const lower = supplierSearchTerm.toLowerCase();
        setFilteredSuppliers(suppliersList.filter(s => 
            (s.name || s.supplier_name).toLowerCase().includes(lower)
        ));
    }
  }, [supplierSearchTerm, suppliersList]);

  // --- HELPERS ---
  const getProductImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${ASSET_URL}${path.startsWith('/') ? path : '/' + path}`
  }

  const showMessage = (title, message, color = 'info', onConfirm = null) => setMsgModal({ visible: true, title, message, color, onConfirm })

  const renderStatusBadge = (status) => {
    if (status === 'Out of Stock') return <CBadge color="danger" shape="rounded-pill" className="px-3">Out of Stock</CBadge>
    if (status === 'Low Stock') return <CBadge color="warning" shape="rounded-pill" className="px-3 text-dark">Low Stock</CBadge>
    return <CBadge color="success" shape="rounded-pill" className="px-3">In Stock</CBadge>
  }

  // --- API CALLS ---
  const fetchProductSuggestions = async (term) => {
      try {
          const res = await inventoryAPI.getProducts({ search: term, limit: 10 });
          if (res.success) {
              setSearchedProducts(res.data.products || []);
          }
      } catch (e) { console.error(e); }
  }

  // [NEW] Load Categories
  const loadFilterOptions = async () => {
      try {
          const res = await productAPI.getCategories();
          if (res.success) {
              setCategoryOptions(res.data || []);
          }
      } catch (e) { console.error("Failed to load categories", e); }
  }

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
        type: selectedType !== 'All' ? selectedType : undefined 
      }

      const response = await inventoryAPI.getProducts(filters)
      
      if (response.success) {
        let fetchedProducts = response.data.products || [];
        const pagination = response.data.pagination || {};
        const total = pagination.totalProducts || response.data.total || fetchedProducts.length;
        
        setProducts(fetchedProducts.map(p => ({
          ...p, 
          reorderPoint: p.reorder_point ?? p.reorderPoint ?? 10, 
          requires_serial: !!p.requires_serial,
          computedStatus: (p.stock || 0) === 0 ? 'Out of Stock' : (p.stock || 0) <= (p.reorder_point || 10) ? 'Low Stock' : 'In Stock'
        })))
        
        setTotalItems(total);
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);
      }
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }, [currentPage, searchQuery, selectedCategory, selectedStatus, selectedType])

  const loadInventoryStats = async () => {
    try {
      const response = await inventoryAPI.getStats()
      if (response.success) setInventoryStats(response.data)
    } catch (error) { console.error(error) }
  }

  const loadSuppliers = async () => {
    try {
      const res = await suppliersAPI.getAll()
      if (res.success) {
          setSuppliersList(res.data || [])
          setFilteredSuppliers(res.data || [])
      }
    } catch (e) { console.error(e) }
  }

  // --- HANDLERS (Same as before) ---
  const handleOpenStockIn = () => {
      setItemForm({ quantity: 1, serials: [] });
      setManifestItems([]);
      setSelectedManifestProduct(null);
      setProductSearchTerm('');
      setSearchedProducts([]); 
      setShowSuggestions(false);
      setSupplierSearchTerm('');
      setGlobalSupplierId('');
      setFilteredSuppliers(suppliersList);
      setShowSupplierSuggestions(false);
      setBulkModalOpen(true);
  }

  const handleOpenReturnModal = async (product) => {
      setReturnProduct(product);
      setReturnForm({ supplierId: '', quantity: 1, selectedSerials: [], reason: 'Defective/Damaged', notes: '' });
      setReturnableSerials([]);
      if (product.requires_serial) {
          setLoadingSerials(true);
          try {
              const res = await serialNumberAPI.getReturnableSerials(product.product_id);
              if (res.success) setReturnableSerials(res.data || []);
          } catch (e) { showMessage('Error', 'Failed to fetch serial numbers.', 'danger'); } 
          finally { setLoadingSerials(false); }
      } else {
          setReturnForm(prev => ({ ...prev, supplierId: product.supplier_id || '' }));
      }
      setReturnModalOpen(true);
  }

  const handleSupplierChange = (e) => {
      const newId = e.target.value;
      const validSerials = returnForm.selectedSerials.filter(sn => {
          if (!newId) return true;
          const item = returnableSerials.find(r => r.serial_number === sn);
          if (!item?.supplier_id) return true;
          return String(item.supplier_id) === String(newId);
      });
      setReturnForm(prev => ({ ...prev, supplierId: newId, selectedSerials: validSerials, quantity: returnProduct.requires_serial ? validSerials.length : prev.quantity }));
  }

  const handleReturnSerialSelection = (snObject, isChecked) => {
      setReturnForm(prev => {
          let updatedSerials = [...prev.selectedSerials];
          let updatedSupplierId = prev.supplierId;
          if (isChecked) {
              updatedSerials.push(snObject.serial_number);
              if (updatedSerials.length === 1 && snObject.supplier_id) updatedSupplierId = snObject.supplier_id;
          } else {
              updatedSerials = updatedSerials.filter(s => s !== snObject.serial_number);
              if (updatedSerials.length === 0) updatedSupplierId = '';
          }
          return { ...prev, selectedSerials: updatedSerials, quantity: updatedSerials.length, supplierId: updatedSupplierId };
      });
  }

  const handleReturnSubmit = async () => {
      if (!returnForm.supplierId) return showMessage('Validation', 'Please select a supplier.', 'warning');
      if (returnProduct.requires_serial && returnForm.selectedSerials.length === 0) return showMessage('Validation', 'Please select at least one serial number to return.', 'warning');
      if (!returnProduct.requires_serial && returnForm.quantity < 1) return showMessage('Validation', 'Quantity must be at least 1.', 'warning');

      setIsSubmitting(true);
      try {
          const payload = {
              supplier: returnForm.supplierId,
              returnedBy: localStorage.getItem('username') || 'Admin',
              reason: returnForm.reason,
              products: [{
                  productId: returnProduct.product_id,
                  quantity: parseInt(returnForm.quantity),
                  serialNumbers: returnProduct.requires_serial ? returnForm.selectedSerials : []
              }]
          };
          await inventoryAPI.returnToSupplier(payload);
          showMessage('Success', 'Items returned to supplier successfully.', 'success', () => {
              setReturnModalOpen(false);
              loadProducts();
              loadInventoryStats();
          });
      } catch (e) { showMessage('Error', e.message || 'Failed to process return.', 'danger'); } 
      finally { setIsSubmitting(false); }
  }

  const updateQuantity = (val) => {
      let newQty = parseInt(val);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      if (selectedManifestProduct?.requires_serial && newQty < itemForm.serials.length) {
          const trimmed = itemForm.serials.slice(0, newQty);
          setItemForm(prev => ({...prev, quantity: newQty, serials: trimmed}));
      } else { setItemForm(prev => ({...prev, quantity: newQty})); }
  }
  const handleIncrement = () => updateQuantity(itemForm.quantity + 1);
  const handleDecrement = () => { if(itemForm.quantity > 1) updateQuantity(itemForm.quantity - 1); };

  const handleProductInputFocus = () => { setShowSuggestions(true); if (searchedProducts.length === 0) fetchProductSuggestions(''); }
  const handleSearchInput = (e) => {
      setProductSearchTerm(e.target.value);
      if(selectedManifestProduct && e.target.value !== selectedManifestProduct.name) setSelectedManifestProduct(null);
      setShowSuggestions(true);
  }
  const handleSelectSuggestion = (product) => {
      const cleanProduct = { ...product, requires_serial: !!product.requires_serial };
      setSelectedManifestProduct(cleanProduct);
      setProductSearchTerm(cleanProduct.name);
      setItemForm(prev => ({...prev, serials: []}));
      setShowSuggestions(false);
  }

  const handleSupplierInputFocus = () => { setShowSupplierSuggestions(true); if (!globalSupplierId) setFilteredSuppliers(suppliersList); }
  const handleSupplierSearchInput = (e) => {
      setSupplierSearchTerm(e.target.value);
      const exactMatch = suppliersList.find(s => (s.name || s.supplier_name) === e.target.value);
      if (!exactMatch) setGlobalSupplierId('');
      setShowSupplierSuggestions(true);
  }
  const handleSelectSupplier = (supplier) => {
      setGlobalSupplierId(supplier.id);
      setSupplierSearchTerm(supplier.name || supplier.supplier_name);
      setShowSupplierSuggestions(false);
  }

  const handleAddToManifest = () => {
      if (!selectedManifestProduct) return showMessage('Validation', 'Please select a valid product.', 'warning');
      if (itemForm.quantity < 1) return showMessage('Validation', 'Quantity must be at least 1.', 'warning');
      if (selectedManifestProduct.requires_serial) {
          if (itemForm.serials.length !== parseInt(itemForm.quantity)) return showMessage('Serial Mismatch', `You set quantity to ${itemForm.quantity} but scanned ${itemForm.serials.length} serials.`, 'warning');
      }

      const existingIdx = manifestItems.findIndex(i => i.product_id === selectedManifestProduct.product_id);
      if (existingIdx >= 0) {
          const updatedItems = [...manifestItems];
          updatedItems[existingIdx].addQuantity += parseInt(itemForm.quantity);
          updatedItems[existingIdx].newSerials = [...updatedItems[existingIdx].newSerials, ...itemForm.serials];
          setManifestItems(updatedItems);
      } else {
          const newItem = { ...selectedManifestProduct, addQuantity: parseInt(itemForm.quantity), newSerials: itemForm.serials };
          setManifestItems(prev => [newItem, ...prev]); 
      }
      setSelectedManifestProduct(null); setProductSearchTerm(''); setItemForm({ quantity: 1, serials: [] }); setSerialInput(''); setSearchedProducts([]);
  }

  const handleRemoveFromManifest = (index) => { setManifestItems(prev => prev.filter((_, i) => i !== index)); }
  const handleCheckManifestSerials = (item) => { setCheckManifestSnModal({ open: true, items: item.newSerials, productName: item.name }); }

  const handleBulkSubmit = async () => {
      if (!globalSupplierId) return showMessage('Missing Info', 'Please select the Supplier.', 'warning');
      if (manifestItems.length === 0) return showMessage('Empty', 'No items in shipment list.', 'warning');
      setIsSubmitting(true);
      try {
          const payload = {
              supplier: globalSupplierId, 
              receivedBy: localStorage.getItem('username') || 'Admin', 
              products: manifestItems.map(item => ({ productId: item.product_id, quantity: item.addQuantity, serialNumbers: item.newSerials }))
          };
          await inventoryAPI.bulkStockIn(payload);
          showMessage('Success', 'Stock received successfully.', 'success', () => {
              setBulkModalOpen(false); setManifestItems([]); setGlobalSupplierId(''); loadProducts(); loadInventoryStats();
          });
      } catch (e) { showMessage('Error', e.message || 'Failed to process.', 'danger'); } 
      finally { setIsSubmitting(false); }
  }

  const handleSerialInput = (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const sn = serialInput.trim().toUpperCase();
          if (!sn) return;
          if (itemForm.serials.includes(sn)) return showMessage('Duplicate', 'Serial already entered.', 'warning');
          if (itemForm.serials.length >= parseInt(itemForm.quantity)) return showMessage('Limit', 'Quantity limit reached.', 'warning');
          setItemForm(prev => ({ ...prev, serials: [...prev.serials, sn] }));
          setSerialInput('');
      }
  }

  const handleViewSerials = async (product) => {
    setViewSerialsModal({ open: true, product, serials: [] }) 
    setLoadingSerials(true)
    try {
      const res = await serialNumberAPI.getAvailableSerials(product.product_id)
      if (res.success) setViewSerialsModal(prev => ({ ...prev, serials: res.data || [] }))
    } catch (e) { showMessage('Error', 'Failed to load serials', 'danger') } 
    finally { setLoadingSerials(false) }
  }

  const handleSaveReorderPoint = async () => {
      setIsSubmitting(true)
      try {
          const targetId = editModal.product.product_id;
          await inventoryAPI.updateStock(targetId, { reorderPoint: editModal.reorderPoint, quantityToAdd: 0 })
          showMessage('Success', 'Inventory settings updated.', 'success')
          setEditModal({ ...editModal, open: false })
          loadProducts()
      } catch (e) { showMessage('Error', 'Failed to update settings.', 'danger') } 
      finally { setIsSubmitting(false) }
  }

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5; 
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) startPage = Math.max(1, endPage - maxVisiblePages + 1);

    items.push(<CPaginationItem key="prev" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{cursor: currentPage===1?'default':'pointer'}}><CIcon icon={cilChevronLeft} size="sm"/></CPaginationItem>);
    if (startPage > 1) { items.push(<CPaginationItem key={1} onClick={() => setCurrentPage(1)} style={{cursor: 'pointer'}}>1</CPaginationItem>); if (startPage > 2) items.push(<CPaginationItem key="e1" disabled>...</CPaginationItem>); }
    for (let i = startPage; i <= endPage; i++) { items.push(<CPaginationItem key={i} active={i === currentPage} onClick={() => setCurrentPage(i)} style={{cursor: 'pointer', backgroundColor: i===currentPage?'var(--brand-navy)':'', borderColor: i===currentPage?'var(--brand-navy)':''}}>{i}</CPaginationItem>); }
    if (endPage < totalPages) { if (endPage < totalPages - 1) items.push(<CPaginationItem key="e2" disabled>...</CPaginationItem>); items.push(<CPaginationItem key={totalPages} onClick={() => setCurrentPage(totalPages)} style={{cursor: 'pointer'}}>{totalPages}</CPaginationItem>); }
    items.push(<CPaginationItem key="next" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{cursor: currentPage===totalPages?'default':'pointer'}}><CIcon icon={cilChevronRight} size="sm"/></CPaginationItem>);
    return items;
  };

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="mb-4 fade-in-up">
        <h2 className="fw-bold text-brand-navy mb-1" style={brandHeaderStyle}>INVENTORY MANAGEMENT</h2>
        <div className="text-medium-emphasis fw-semibold">Real-time stock monitoring and adjustments</div>
      </div>

      {/* --- STAT CARDS --- */}
      <CRow className="mb-4 g-3 fade-in-up delay-100">
        <CCol sm={6} lg={3}><StatCard title="Total Products" value={inventoryStats.totalProducts} icon={<CIcon icon={cilInbox}/>} gradient="linear-gradient(135deg, #17334e 0%, #0f2438 100%)" /></CCol>
        <CCol sm={6} lg={3}><StatCard title="In Stock" value={inventoryStats.inStock} icon={<CIcon icon={cilCheckCircle}/>} gradient="linear-gradient(135deg, #2eb85c 0%, #1b9e3e 100%)" /></CCol>
        <CCol sm={6} lg={3}><StatCard title="Low Stock" value={inventoryStats.lowStock} icon={<CIcon icon={cilWarning}/>} gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" textColor="text-brand-navy"/></CCol>
        <CCol sm={6} lg={3}><StatCard title="Out of Stock" value={inventoryStats.outOfStock} icon={<CIcon icon={cilXCircle}/>} gradient="linear-gradient(135deg, #e55353 0%, #b21f2d 100%)" /></CCol>
      </CRow>

      {/* --- MAIN INVENTORY CARD --- */}
      <CCard className="mb-4 border-0 shadow-sm overflow-hidden fade-in-up delay-200">
        <CCardHeader className="bg-white p-3 border-bottom d-flex flex-wrap gap-3 align-items-center justify-content-between">
             <div className="d-flex gap-2 flex-grow-1 flex-wrap" style={{maxWidth: '800px'}}>
                <div className="bg-light rounded px-3 py-2 d-flex align-items-center border" style={{minWidth: '250px'}}>
                  <CIcon icon={cilMagnifyingGlass} className="text-muted me-2"/>
                  <input className="border-0 bg-transparent w-100" style={{outline: 'none', fontSize: '0.9rem'}} placeholder="Search products..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                </div>
                
                {/* [UPDATED] CATEGORY DROPDOWN - Uses Stable Options */}
                <CFormSelect className="form-select-sm" style={{maxWidth: '180px', borderColor:'#e9ecef'}} value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
                  <option value="All">All Categories</option>
                  {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </CFormSelect>

                <CFormSelect className="form-select-sm" style={{maxWidth: '140px', borderColor:'#e9ecef'}} value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}>
                  <option value="All">All Types</option>
                  <option value="Standard">Standard</option>
                  <option value="Serialized">Serialized</option>
                </CFormSelect>

                <CFormSelect className="form-select-sm" style={{maxWidth: '140px', borderColor:'#e9ecef'}} value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}>
                  <option value="All">All Status</option><option value="In Stock">In Stock</option><option value="Low Stock">Low Stock</option><option value="Out of Stock">Out of Stock</option>
                </CFormSelect>
             </div>
             
             <CButton style={{backgroundColor: '#17334e', borderColor: '#17334e'}} className="text-white fw-bold px-4 shadow-sm" onClick={handleOpenStockIn}>
                <CIcon icon={cilTruck} className="me-2"/> STOCK IN
             </CButton>
        </CCardHeader>

        <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col" style={{width: '30%'}}>Product Details</th>
                  <th scope="col" style={{width: '15%'}}>Category</th>
                  <th scope="col" className="text-center" style={{width: '15%'}}>Type</th>
                  <th scope="col" className="text-center" style={{width: '10%'}}>Stock</th>
                  <th scope="col" className="text-center" style={{width: '15%'}}>Status</th>
                  <th scope="col" className="text-end pe-4" style={{width: '20%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5"><CSpinner color="primary"/></td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No products found.</td></tr>
                ) : (
                  products.map((p) => {
                     const imgUrl = getProductImageUrl(p.image)
                     return (
                      <tr key={p.product_id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                             {imgUrl ? (
                              <div className="table-thumbnail-slot">
                                <img src={imgUrl} alt={p.name} className="table-thumbnail" />
                              </div>
                            ) : (
                                <div className="table-thumbnail-slot placeholder-thumbnail">
                                  <CIcon icon={cilImage} className="text-secondary opacity-50"/>
                                </div>
                            )}
                            <div>
                              <div className="fw-bold text-dark fs-6">{p.name}</div>
                              <div className="small text-muted">
                                <span className="fw-semibold">{p.brand}</span> <span className="mx-1">•</span> {p.product_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border fw-normal">{p.category}</span></td>
                        <td className="text-center">
                           {p.requires_serial ? <CBadge color="info" shape="rounded-pill" className="text-white"><CIcon icon={cilBarcode} size="sm" className="me-1"/> SERIAL</CBadge> : <CBadge color="light" shape="rounded-pill" className="text-dark border">STANDARD</CBadge>}
                        </td>
                        <td className="text-center"><span className="fw-bold fs-5 text-brand-navy">{Number(p.stock ?? 0).toLocaleString()}</span></td>
                        <td className="text-center">{renderStatusBadge(p.computedStatus)}</td>
                        
                        <td className="text-end pe-4">
                           <div className="d-flex justify-content-end gap-2">
                              <CTooltip content="Return to Supplier">
                                <CButton 
                                    size="sm" 
                                    color="danger" 
                                    className="text-white shadow-sm d-flex align-items-center justify-content-center" 
                                    style={{width: '32px', height: '32px', padding: 0}}
                                    onClick={() => handleOpenReturnModal(p)}
                                >
                                  <CIcon icon={cilArrowThickFromRight} size="sm"/>
                                </CButton>
                              </CTooltip>
                              
                              {p.requires_serial && (
                                <CTooltip content="View Serials">
                                  <CButton 
                                    size="sm" 
                                    color="info" 
                                    className="text-white shadow-sm d-flex align-items-center justify-content-center" 
                                    style={{width: '32px', height: '32px', padding: 0}}
                                    onClick={() => handleViewSerials(p)}
                                  >
                                    <CIcon icon={cilList} size="sm"/>
                                  </CButton>
                                </CTooltip>
                              )}
                              
                              <CTooltip content="Settings">
                                <CButton 
                                    size="sm" 
                                    className="text-white shadow-sm d-flex align-items-center justify-content-center" 
                                    style={{width: '32px', height: '32px', padding: 0, backgroundColor: '#17334e', borderColor: '#17334e'}}
                                    onClick={() => setEditModal({ open: true, product: p, reorderPoint: p.reorderPoint })}
                                >
                                  <CIcon icon={cilPencil} size="sm"/>
                                </CButton>
                              </CTooltip>
                           </div>
                        </td>
                      </tr>
                     )
                  })
                )}
              </tbody>
            </table>
        </div>
        
        <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
             <span className="small text-muted fw-semibold">
                Showing {products.length} of {totalItems} items
             </span>
             <CPagination className="mb-0 justify-content-end">
                {renderPaginationItems()}
             </CPagination>
        </div>
      </CCard>

      {/* ... (rest of modals) ... */}
      <CModal visible={bulkModalOpen} onClose={() => setBulkModalOpen(false)} size="lg" alignment="center" backdrop="static" scrollable>
        <CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={brandHeaderStyle}>STOCK IN</CModalTitle></CModalHeader>
        <CModalBody className="p-4 bg-light">
            <div className="d-flex flex-column gap-4">
                {/* 1. SHIPMENT SOURCE */}
                <div className="bg-white p-3 rounded shadow-sm border">
                    <CFormLabel htmlFor="supplierSelect" className="fw-bold text-brand-navy mb-1 text-uppercase small ls-1">Shipment Source</CFormLabel>
                    <div className="position-relative" ref={supplierWrapperRef}>
                        <div className="input-group">
                            <input 
                                id="supplierSelect"
                                type="text"
                                className="form-control"
                                placeholder="Select or Search Supplier..." 
                                value={supplierSearchTerm}
                                onChange={handleSupplierSearchInput}
                                onFocus={handleSupplierInputFocus}
                                autoComplete="off"
                            />
                            <span className="input-group-text bg-white text-muted"><CIcon icon={cilChevronBottom}/></span>
                        </div>
                        {showSupplierSuggestions && (
                            <div className="position-absolute w-100 bg-white border rounded shadow-lg" style={{zIndex: 1060, maxHeight: '200px', overflowY: 'auto', marginTop: '2px'}}>
                                {filteredSuppliers.length === 0 ? <div className="p-3 text-muted text-center small">No suppliers found.</div> : filteredSuppliers.map(s => (<div key={s.id} className="p-2 border-bottom px-3 dropdown-item-custom" onClick={() => handleSelectSupplier(s)}><div className="fw-bold text-dark">{s.name || s.supplier_name}</div></div>))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. ITEM ENTRY */}
                <div className="bg-white p-3 rounded shadow-sm border">
                    <CFormLabel className="fw-bold text-brand-navy mb-3 text-uppercase small ls-1">Add Items</CFormLabel>
                    <CRow className="g-3 mb-3">
                         <CCol sm={8}>
                             <div className="position-relative" ref={searchWrapperRef}>
                                <label htmlFor="productSearch" className="text-muted small fw-bold mb-1">Product</label>
                                <div className="input-group"><span className="input-group-text bg-white"><CIcon icon={cilMagnifyingGlass}/></span><input type="text" id="productSearch" className="form-control" placeholder="Search Product..." value={productSearchTerm} onChange={handleSearchInput} onFocus={handleProductInputFocus} autoComplete="off"/></div>
                                {showSuggestions && (<div className="position-absolute w-100 bg-white border rounded shadow-lg" style={{zIndex: 1050, maxHeight: '250px', overflowY: 'auto', top: '100%', marginTop: '5px'}}>{searchedProducts.map(p => (<div key={p.product_id} className="p-2 border-bottom d-flex align-items-center gap-3 dropdown-item-custom" onClick={() => handleSelectSuggestion(p)}>{p.image ? <img src={getProductImageUrl(p.image)} alt="" style={{width:'35px', height:'35px', objectFit:'cover', borderRadius:'4px'}} /> : <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{width:'35px', height:'35px'}}><CIcon icon={cilImage} className="text-secondary"/></div>}<div><div className="fw-bold text-dark small">{p.name}</div><div className="small text-muted" style={{fontSize:'0.75rem'}}>ID: {p.product_id} | Stock: {p.stock}</div></div></div>))}</div>)}
                             </div>
                         </CCol>
                         <CCol sm={4}>
                             <label htmlFor="qtyInput" className="text-muted small fw-bold mb-1">Quantity</label>
                             <div className="input-group"><button className="btn btn-light border" type="button" onClick={handleDecrement}><CIcon icon={cilMinus} size="sm"/></button><input id="qtyInput" type="number" min="1" className="form-control text-center fw-bold" value={itemForm.quantity} onChange={(e) => updateQuantity(e.target.value)} /><button className="btn btn-light border" type="button" onClick={handleIncrement}><CIcon icon={cilPlus} size="sm"/></button></div>
                         </CCol>
                    </CRow>
                    
                    {selectedManifestProduct && (<div className="mb-3 p-2 bg-success bg-opacity-10 border border-success rounded d-flex align-items-center gap-2"><CIcon icon={cilCheckCircle} className="text-success"/><div className="small text-success fw-bold">{selectedManifestProduct.name}</div><CButton color="secondary" variant="ghost" size="sm" className="ms-auto" onClick={() => {setSelectedManifestProduct(null); setProductSearchTerm('');}}><CIcon icon={cilXCircle}/></CButton></div>)}

                    {selectedManifestProduct?.requires_serial && (
                        <div className="p-3 bg-light border rounded mb-3"><div className="d-flex justify-content-between align-items-center mb-2"><span className="text-brand-blue fw-bold small">SCAN SERIALS</span><span className="badge bg-secondary">Scanned: {itemForm.serials.length} of {itemForm.quantity}</span></div><div className="d-flex gap-2"><CFormInput ref={serialInputRef} placeholder="Scan Serial + Enter" value={serialInput} onChange={e => setSerialInput(e.target.value)} onKeyDown={handleSerialInput} disabled={itemForm.serials.length >= parseInt(itemForm.quantity)}/><CButton color="primary" variant="outline" onClick={() => handleSerialInput({key:'Enter', preventDefault:()=>{}})}>+</CButton></div><div className="d-flex flex-wrap gap-1 mt-2">{itemForm.serials.map((s, i) => <CBadge key={i} color="info" shape="rounded-pill">{s}</CBadge>)}</div></div>
                    )}
                    <button className="btn-brand btn-brand-primary w-100" onClick={handleAddToManifest} disabled={!selectedManifestProduct}><CIcon icon={cilPlus} className="me-2"/> ADD TO SHIPMENT</button>
                </div>

                {/* 3. SHIPMENT LIST */}
                <div className="bg-white p-3 rounded shadow-sm border">
                    <CFormLabel className="fw-bold text-brand-navy mb-2 text-uppercase small ls-1">Shipment List</CFormLabel>
                    <div className="border rounded overflow-hidden" style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <table className="admin-table mb-0"><thead><tr><th scope="col" style={{width: '50%'}}>Product</th><th scope="col" className="text-center" style={{width: '20%'}}>Qty</th><th scope="col" className="text-center" style={{width: '30%'}}>Action</th></tr></thead><tbody>{manifestItems.length === 0 ? (<tr><td colSpan="3" className="text-center text-muted py-4">No items added yet.</td></tr>) : (manifestItems.map((item, i) => (<tr key={i}><td><div className="fw-bold">{item.name}</div><div className="text-muted small">{item.product_id}</div>{item.requires_serial && (<button className="btn btn-sm btn-link text-decoration-none p-0 small" onClick={() => handleCheckManifestSerials(item)}>View Serials ({item.newSerials.length})</button>)}</td><td className="text-center fw-bold fs-5">{item.addQuantity}</td><td className="text-center"><CTooltip content="Remove line"><CButton size="sm" color="danger" variant="ghost" onClick={() => handleRemoveFromManifest(i)}><CIcon icon={cilTrash}/></CButton></CTooltip></td></tr>)))}</tbody></table>
                    </div>
                </div>
            </div>
        </CModalBody>
        <CModalFooter className="bg-light"><button className="btn-brand btn-brand-outline" onClick={() => setBulkModalOpen(false)}>Close</button><button className="btn-brand btn-brand-success" onClick={handleBulkSubmit} disabled={isSubmitting || manifestItems.length === 0}>{isSubmitting ? <CSpinner size="sm"/> : 'PROCESS STOCK IN'}</button></CModalFooter>
      </CModal>

      {/* --- RETURN TO SUPPLIER MODAL --- */}
      <CModal visible={returnModalOpen} onClose={() => setReturnModalOpen(false)} size="lg" alignment="center" backdrop="static">
          <CModalHeader className="bg-danger text-white"><CModalTitle component="span" style={brandHeaderStyle}>RETURN TO SUPPLIER</CModalTitle></CModalHeader>
          <CModalBody className="p-4">
              {returnProduct && (
                  <div className="d-flex flex-column gap-3">
                      <div className="bg-light p-3 rounded border"><div className="fw-bold text-dark">{returnProduct.name}</div><div className="small text-muted">ID: {returnProduct.product_id}</div></div>
                      <CRow className="g-3">
                          <CCol md={6}><CFormLabel htmlFor="supplierSelect" className="small fw-bold">Select Supplier</CFormLabel><CFormSelect id="supplierSelect" value={returnForm.supplierId} onChange={handleSupplierChange}><option value="">Select Supplier...</option>{suppliersList.map(s => <option key={s.id} value={s.id}>{s.name || s.supplier_name}</option>)}</CFormSelect></CCol>
                          <CCol md={6}><CFormLabel htmlFor="reasonSelect" className="small fw-bold">Reason</CFormLabel><CFormSelect id="reasonSelect" value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})}><option value="Defective/Damaged">Defective / Damaged</option><option value="Overstock">Overstock</option><option value="Wrong Item">Wrong Item Sent</option><option value="Other">Other</option></CFormSelect></CCol>
                      </CRow>
                      {returnProduct.requires_serial ? (<div><CFormLabel className="small fw-bold mb-2">Select Serials to Return</CFormLabel>{loadingSerials ? <div className="text-center py-3"><CSpinner size="sm"/></div> : (<div className="border rounded p-2" style={{maxHeight: '200px', overflowY: 'auto'}}>{returnableSerials.length === 0 ? (<div className="text-muted small text-center p-3">No returnable serial numbers found.</div>) : (returnableSerials.map(sn => { const isDisabled = returnForm.supplierId && sn.supplier_id && String(sn.supplier_id) !== String(returnForm.supplierId); return (<div key={sn.id} className={`d-flex align-items-center gap-2 p-2 border-bottom ${isDisabled ? 'bg-secondary bg-opacity-10 opacity-50' : ''}`}><CFormCheck id={`sn-${sn.id}`} checked={returnForm.selectedSerials.includes(sn.serial_number)} onChange={(e) => handleReturnSerialSelection(sn, e.target.checked)} disabled={isDisabled}/><label htmlFor={`sn-${sn.id}`} className={`flex-grow-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}><div className="d-flex justify-content-between align-items-center w-100"><div><span className="font-monospace fw-bold">{sn.serial_number}</span><span className="ms-2">{sn.status === 'available' && <CBadge color="success" size="sm">Available</CBadge>}{sn.status === 'defective' && <CBadge color="danger" size="sm">Defective</CBadge>}{sn.status === 'returned' && <CBadge color="warning" size="sm" className="text-dark">Returned</CBadge>}</span></div>{sn.supplier_name && (<div className="small text-muted fst-italic"><CIcon icon={cilTruck} size="sm" className="me-1"/>{sn.supplier_name}</div>)}</div></label></div>)}))}</div>)}<div className="small text-muted mt-2 text-end">Selected: {returnForm.selectedSerials.length}</div></div>) : (<div><CFormLabel htmlFor="qtyReturn" className="small fw-bold">Quantity to Return</CFormLabel><CFormInput id="qtyReturn" type="number" min="1" max={returnProduct.stock} value={returnForm.quantity} onChange={e => setReturnForm({...returnForm, quantity: e.target.value})} /><div className="form-text">Current Stock: {returnProduct.stock}</div></div>)}
                      <div><CFormLabel htmlFor="returnNotes" className="small fw-bold">Additional Notes</CFormLabel><CFormTextarea id="returnNotes" rows={2} value={returnForm.notes} onChange={e => setReturnForm({...returnForm, notes: e.target.value})} /></div>
                  </div>
              )}
          </CModalBody>
          <CModalFooter className="bg-light"><button className="btn-brand btn-brand-outline" onClick={() => setReturnModalOpen(false)}>Cancel</button><button className="btn-brand btn-brand-danger" onClick={handleReturnSubmit} disabled={isSubmitting}>{isSubmitting ? <CSpinner size="sm"/> : 'CONFIRM RETURN'}</button></CModalFooter>
      </CModal>

      {/* --- OTHER MODALS --- */}
      <CModal visible={checkManifestSnModal.open} onClose={() => setCheckManifestSnModal({...checkManifestSnModal, open: false})} alignment="center" size="sm"><CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={brandHeaderStyle}>SERIAL NUMBERS</CModalTitle></CModalHeader><CModalBody><ul className="list-group list-group-flush">{checkManifestSnModal.items.map((sn, i) => <li key={i} className="list-group-item px-0 py-2 small fw-bold text-dark">{sn}</li>)}</ul></CModalBody></CModal>

      <CModal visible={viewSerialsModal.open} onClose={() => setViewSerialsModal({...viewSerialsModal, open: false})} alignment="center"><CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={brandHeaderStyle}>AVAILABLE SERIALS</CModalTitle></CModalHeader><CModalBody className="p-0">{loadingSerials ? <div className="text-center py-4"><CSpinner color="primary"/></div> : viewSerialsModal.serials.length === 0 ? <div className="text-center text-muted py-4">No serials found.</div> : (<ul className="list-group list-group-flush" style={{maxHeight: '400px', overflowY: 'auto'}}>{viewSerialsModal.serials.map((s, i) => (<li key={i} className="list-group-item d-flex justify-content-between align-items-center py-3 px-4"><span className="font-monospace fw-bold text-dark">{s.serial_number}</span><CBadge color="success" shape="rounded-pill">Available</CBadge></li>))}</ul>)}</CModalBody><CModalFooter className="bg-light"><button className="btn-brand btn-brand-outline" onClick={() => setViewSerialsModal({...viewSerialsModal, open: false})}>Close</button></CModalFooter></CModal>

      <CModal visible={editModal.open} onClose={() => setEditModal({...editModal, open: false})} alignment="center"><CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={brandHeaderStyle}>INVENTORY SETTINGS</CModalTitle></CModalHeader><CModalBody className="p-4"><div className="mb-3"><CFormLabel htmlFor="reorderInput" className="fw-bold text-brand-navy mb-2 text-uppercase small ls-1">Reorder Level</CFormLabel><CFormInput id="reorderInput" type="number" min="0" value={editModal.reorderPoint} onChange={(e) => setEditModal({...editModal, reorderPoint: e.target.value})} /><div className="form-text mt-2">Alert when stock falls below this number.</div></div></CModalBody><CModalFooter className="bg-light"><button className="btn-brand btn-brand-outline" onClick={() => setEditModal({...editModal, open: false})}>Cancel</button><button className="btn-brand btn-brand-primary" onClick={handleSaveReorderPoint} disabled={isSubmitting}>{isSubmitting ? <CSpinner size="sm"/> : 'SAVE SETTINGS'}</button></CModalFooter></CModal>

      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}><CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle component="span" style={brandHeaderStyle}>{msgModal.title}</CModalTitle></CModalHeader><CModalBody className="py-4">{msgModal.message}</CModalBody><CModalFooter className="bg-light">{msgModal.onConfirm ? (<CButton color={msgModal.color} className="text-white" onClick={() => { msgModal.onConfirm(); setMsgModal(p => ({ ...p, visible: false })) }}>Confirm</CButton>) : (<CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton>)}</CModalFooter></CModal>
    </CContainer>
  )
}

export default InventoryPage