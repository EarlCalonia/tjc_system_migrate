import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CCardHeader, CButton, CFormInput, CFormSelect, CFormLabel,
  CFormTextarea, CFormSwitch, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CBadge, CSpinner, CTooltip, CPagination, CPaginationItem
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilMagnifyingGlass, cilPlus, cilPencil, cilTrash, cilImage, 
  cilCloudUpload, cilCrop, cilTags, cilCheckCircle, cilXCircle, cilLayers, cilChevronLeft, cilChevronRight
} from '@coreui/icons'
import { productAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

import '../../styles/Admin.css'
import '../../styles/App.css' 
import '../../styles/ProductPage.css'

const ASSET_URL = 'http://localhost:5000'

const UOM_MAP = {
    'EA': 'Each', 'SET': 'Set', 'KIT': 'Kit', 'PR': 'Pair', 'ASY': 'Assembly', 'PK': 'Pack'
};
const UOM_OPTIONS = Object.keys(UOM_MAP);
const CROP_ASPECT = 4 / 3; 
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

// --- CROP MODAL ---
const ImageCropModal = ({ visible, imageSrc, onClose, onApply, loading }) => {
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
        <CModal visible={visible} onClose={onClose} size="lg" alignment="center" backdrop="static" scrollable>
            <CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white font-oswald">ADJUST IMAGE</CModalTitle></CModalHeader>
            <CModalBody className="d-flex justify-content-center bg-dark p-0 overflow-hidden">
                {imageSrc && (<div style={{maxHeight: '60vh'}}><ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={CROP_ASPECT}><img src={imageSrc} alt="Crop" style={{ maxWidth: '100%', maxHeight: '60vh' }} crossOrigin="anonymous" onLoad={onImageLoad} /></ReactCrop></div>)}
            </CModalBody>
            <CModalFooter className="bg-dark border-top-0"><CButton color="secondary" variant="ghost" className="text-light" onClick={onClose}>Cancel</CButton><CButton color="info" onClick={handleApply} disabled={loading || !completedCrop}>{loading ? <CSpinner size="sm"/> : 'Apply Crop'}</CButton></CModalFooter>
        </CModal>
    )
}

// --- PRODUCT FORM MODAL ---
const ProductFormModal = ({ visible, productToEdit, categories, brands, onClose, onSuccess }) => {
    const fileInputRef = useRef(null);
    const [form, setForm] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [cropVisible, setCropVisible] = useState(false);
    const [cropSrc, setCropSrc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasUnremovableSerials, setHasUnremovableSerials] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const isAddMode = !productToEdit;

    useEffect(() => {
        if (visible) {
            if (productToEdit) {
                setForm({ ...productToEdit, unit_tag: productToEdit.unit_tag || 'EA' });
                setPreview(getImageUrl(productToEdit.image));
                checkSerials(productToEdit);
            } else {
                setForm({ name: '', brand: '', category: '', price: 0, status: 'Active', description: '', vehicle_compatibility: '', requires_serial: false, unit_tag: 'EA' });
                setPreview(null);
                setHasUnremovableSerials(false);
            }
            setImageFile(null);
            setCropSrc(null);
        }
    }, [visible, productToEdit]);

    const getImageUrl = (path) => path ? (path.startsWith('http') ? path : `${ASSET_URL}${path.startsWith('/') ? path : `/${path}`}`) : null;

    const checkSerials = async (prod) => {
        if (prod.requires_serial) {
            try {
                const res = await serialNumberAPI.getAllSerials(prod.product_id);
                setHasUnremovableSerials(res.success && res.data.length > 0);
            } catch (e) { console.error(e); }
        } else { setHasUnremovableSerials(false); }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return alert('Invalid image file');
        
        const reader = new FileReader();
        reader.onloadend = () => { setCropSrc(reader.result); setCropVisible(true); }
        reader.readAsDataURL(file);
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCropResult = (blob) => {
        const file = new File([blob], "product_image.jpg", { type: 'image/jpeg' });
        setImageFile(file);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(blob));
        setCropVisible(false);
    };

    const handleSubmit = async () => {
        if (!form.name || !form.price) return alert('Name and Price are required');
        setLoading(true);
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (key !== 'image' && form[key] !== null && form[key] !== undefined) formData.append(key, form[key]);
            });
            if (imageFile) formData.append('image', imageFile);
            
            const id = isAddMode ? null : (form.product_id || form.id);
            const apiCall = isAddMode ? productAPI.createProduct(formData) : productAPI.updateProduct(id, formData);
            
            const res = await apiCall;
            if (res.success) {
                onSuccess(isAddMode ? 'Product added' : 'Product updated');
                onClose();
            } else { alert(res.message); }
        } catch (e) { alert(e.message); } 
        finally { setLoading(false); }
    };

    return (
        <>
            <CModal visible={visible} onClose={onClose} size="lg" alignment="center" backdrop="static" scrollable>
                <CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white font-oswald">{isAddMode ? 'ADD NEW PART' : 'EDIT PART DETAILS'}</CModalTitle></CModalHeader>
                <CModalBody className="bg-light p-4">
                    <div className="vertical-product-form">
                        <div className="bg-white p-3 rounded shadow-sm border mb-3">
                            <h6 className="fw-bold text-brand-navy mb-3 small ls-1 border-bottom pb-2">1. IDENTIFICATION</h6>
                            <CRow className="g-3">
                                <CCol md={12}>
                                    <CFormLabel htmlFor="productName" className="small fw-bold text-muted">Part Name <span className="text-danger">*</span></CFormLabel>
                                    <CFormInput id="productName" name="name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                                </CCol>
                                <CCol md={6}>
                                    <CFormLabel htmlFor="productBrand" className="small fw-bold text-muted">Brand</CFormLabel>
                                    <CFormSelect id="productBrand" name="brand" value={form.brand || ''} onChange={e => setForm({...form, brand: e.target.value})} className="brand-select">
                                        <option value="">Select Brand</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
                                    </CFormSelect>
                                </CCol>
                                <CCol md={6}>
                                    <CFormLabel htmlFor="vehicleFits" className="small fw-bold text-muted">Vehicle Fits</CFormLabel>
                                    <CFormInput id="vehicleFits" name="vehicle_compatibility" value={form.vehicle_compatibility || ''} onChange={e => setForm({...form, vehicle_compatibility: e.target.value})} />
                                </CCol>
                                <CCol md={12}>
                                    <CFormLabel htmlFor="description" className="small fw-bold text-muted">Detailed Specs</CFormLabel>
                                    <CFormTextarea id="description" name="description" rows={2} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                                </CCol>
                            </CRow>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border mb-3">
                            <h6 className="fw-bold text-brand-navy mb-3 small ls-1 border-bottom pb-2">2. PRICING & PACKAGING</h6>
                            <CRow className="g-3">
                                <CCol md={4}>
                                    <CFormLabel htmlFor="category" className="small fw-bold text-muted">Category</CFormLabel>
                                    <CFormSelect id="category" name="category" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="brand-select">
                                        <option value="">Select Category</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </CFormSelect>
                                </CCol>
                                <CCol md={4}>
                                    <CFormLabel htmlFor="unitTag" className="small fw-bold text-muted">Unit of Measure</CFormLabel>
                                    <CFormSelect id="unitTag" name="unit_tag" value={form.unit_tag || 'EA'} onChange={e => setForm({...form, unit_tag: e.target.value})} className="brand-select">
                                        {UOM_OPTIONS.map(u => <option key={u} value={u}>{u} - {UOM_MAP[u]}</option>)}
                                    </CFormSelect>
                                </CCol>
                                <CCol md={4}>
                                    <CFormLabel htmlFor="productPrice" className="small fw-bold text-muted">Retail Price (₱)</CFormLabel>
                                    <CFormInput id="productPrice" name="price" type="number" min="0" step="100" value={form.price || ''} onChange={e => setForm({...form, price: e.target.value})} />
                                </CCol>
                            </CRow>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border">
                            <h6 className="fw-bold text-brand-navy mb-3 small ls-1 border-bottom pb-2">3. VISUALS & SETTINGS</h6>
                            <CRow className="g-3 align-items-start">
                                <CCol md={5} className="d-flex flex-column align-items-center border-end pe-4">
                                    <div className="image-upload-preview mb-2 d-flex flex-column align-items-center justify-content-center" onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}} onDragLeave={() => setIsDragging(false)} onDrop={(e) => {e.preventDefault(); setIsDragging(false); handleFileSelect({target:{files:e.dataTransfer.files}})}} onClick={() => fileInputRef.current?.click()} style={{borderColor: isDragging ? 'var(--brand-blue)' : '#dee2e6'}}>
                                        {preview ? <img src={preview} alt="Preview" /> : <div className="text-center text-muted p-3"><CIcon icon={cilCloudUpload} size="xl"/><div className="small mt-1 fw-bold">Click to Upload</div></div>}
                                    </div>
                                    <input type="file" id="imageUpload" name="image" accept="image/*" onChange={handleFileSelect} ref={fileInputRef} style={{ display: 'none' }} />
                                    {(preview || imageFile) && (<CButton color="info" variant="ghost" size="sm" className="w-100" onClick={() => { if(!cropSrc && preview) setCropSrc(preview); setCropVisible(true); }}><CIcon icon={cilCrop} className="me-1"/> Crop / Adjust</CButton>)}
                                </CCol>
                                <CCol md={7}>
                                    <div className="d-flex flex-column gap-3 h-100 justify-content-center ps-2">
                                        <div className="d-flex justify-content-between align-items-center p-2 border rounded bg-light">
                                            <div><div className="fw-bold text-brand-navy">Serialized</div><div className="small text-muted">Requires unique serials?</div></div>
                                            <CFormSwitch id="requiresSerial" name="requires_serial" size="lg" checked={form.requires_serial || false} disabled={hasUnremovableSerials} onChange={e => setForm({...form, requires_serial: e.target.checked})} />
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center p-2 border rounded bg-light">
                                            <div><div className="fw-bold text-brand-navy">Active</div><div className="small text-muted">Show in catalog?</div></div>
                                            <CFormSwitch id="productStatus" name="status" size="lg" checked={form.status === 'Active'} onChange={e => setForm({...form, status: e.target.checked ? 'Active' : 'Inactive'})} />
                                        </div>
                                    </div>
                                </CCol>
                            </CRow>
                        </div>
                    </div>
                </CModalBody>
                <CModalFooter className="bg-light"><button className="btn-brand btn-brand-outline" onClick={onClose}>Cancel</button><button className="btn-brand btn-brand-primary" onClick={handleSubmit} disabled={loading}>{loading ? <CSpinner size="sm" /> : 'Save Changes'}</button></CModalFooter>
            </CModal>
            <ImageCropModal visible={cropVisible} imageSrc={cropSrc} onClose={() => setCropVisible(false)} onApply={handleCropResult} loading={false} />
        </>
    )
}

// --- MAIN PAGE COMPONENT ---
const ProductPage = () => {
  const [products, setProducts] = useState([]); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1)
  const [cat, setCat] = useState('All Categories'); const [brd, setBrd] = useState('All Brand'); 
  const [stat, setStat] = useState('All Status'); const [unit, setUnit] = useState('All Units')
  const [categories, setCategories] = useState([]); const [brands, setBrands] = useState([])
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); 
  const [msg, setMsg] = useState({ show: false, title: '', text: '', color: 'info', confirm: null })
  
  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, categories: 0 });

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
       const res = await productAPI.getProducts({ 
           page, limit: ITEMS_PER_PAGE, search, category: cat!=='All Categories'?cat:undefined, 
           brand: brd!=='All Brand'?brd:undefined, status: stat!=='All Status'?stat:undefined, unit: unit!=='All Units'?unit:undefined 
       })
       if(res.success) { 
           setProducts(res.data.products||[]); 
           setTotal(res.data.pagination?.totalProducts||0) 
       }
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [page, search, cat, brd, stat, unit])

  const loadMeta = async () => {
      try {
          // 1. Fetch Filter Options
          const c = await productAPI.getCategories(); if(c.success) setCategories(c.data || [])
          const b = await productAPI.getBrands(); if(b.success) setBrands(b.data || [])

          // 2. Fetch Explicit Counts for Stat Cards
          const [activeRes, inactiveRes] = await Promise.all([
             productAPI.getProducts({ status: 'Active', limit: 1 }),
             productAPI.getProducts({ status: 'Inactive', limit: 1 })
          ]);

          setStats({ 
             categories: (c.data || []).length,
             active: activeRes.success ? activeRes.data.pagination.totalProducts : 0,
             inactive: inactiveRes.success ? inactiveRes.data.pagination.totalProducts : 0,
             total: (activeRes.data?.pagination?.totalProducts || 0) + (inactiveRes.data?.pagination?.totalProducts || 0) 
          });

      } catch(e){ console.error("Failed to load stats", e) }
  }

  useEffect(() => { loadMeta(); }, [total])
  useEffect(() => { const t = setTimeout(loadData, 300); return ()=>clearTimeout(t); }, [loadData])

  const handleAdd = () => { setEditingProduct(null); setFormVisible(true); }
  const handleEdit = (p) => { setEditingProduct(p); setFormVisible(true); }
  const handleDelete = (p) => {
      setMsg({ show: true, title: 'Confirm Delete', text: `Delete "${p.name}"?`, color: 'danger', confirm: async () => {
          try { await productAPI.deleteProduct(p.id || p.product_id); setMsg({ show: false }); loadData(); loadMeta(); }
          catch(e) { alert('Failed to delete'); }
      }})
  }

  const getImageUrl = (path) => path ? (path.startsWith('http') ? path : `${ASSET_URL}${path.startsWith('/') ? path : `/${path}`}`) : null;
  const totalPages = Math.ceil(total/ITEMS_PER_PAGE);

  // --- PAGINATION RENDERER ---
  const renderPaginationItems = () => {
    const items = []; const maxVisible = 5; 
    let start = Math.max(1, page - Math.floor(maxVisible/2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    const StyledPageItem = ({ active, disabled, onClick, children }) => (
      <CPaginationItem active={active} disabled={disabled} onClick={onClick} style={{cursor: disabled?'default':'pointer', backgroundColor: active?'#17334e':'transparent', borderColor: active?'#17334e':'#dee2e6', color: active?'#fff':'#17334e', fontWeight: active?'bold':'normal', marginLeft:'4px', borderRadius:'4px'}}>{children}</CPaginationItem>
    );

    items.push(<StyledPageItem key="prev" disabled={page===1} onClick={()=>setPage(p=>Math.max(1, p-1))}><CIcon icon={cilChevronLeft} size="sm"/></StyledPageItem>);
    if(start>1){ items.push(<StyledPageItem key={1} onClick={()=>setPage(1)}>1</StyledPageItem>); if(start>2) items.push(<StyledPageItem key="e1" disabled>...</StyledPageItem>); }
    for(let i=start; i<=end; i++) items.push(<StyledPageItem key={i} active={i===page} onClick={()=>setPage(i)}>{i}</StyledPageItem>);
    if(end<totalPages){ if(end<totalPages-1) items.push(<StyledPageItem key="e2" disabled>...</StyledPageItem>); items.push(<StyledPageItem key={totalPages} onClick={()=>setPage(totalPages)}>{totalPages}</StyledPageItem>); }
    items.push(<StyledPageItem key="next" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages, p+1))}><CIcon icon={cilChevronRight} size="sm"/></StyledPageItem>);
    return items;
  };

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
            <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald, sans-serif', letterSpacing: '1px'}}>PRODUCT CATALOG</h2>
            <div className="text-medium-emphasis fw-semibold">Inventory items and pricing</div>
        </div>
        <button className="btn-brand btn-brand-primary" onClick={handleAdd}><CIcon icon={cilPlus} className="me-2"/> Add New Part</button>
      </div>

      {/* --- STAT CARDS --- */}
      <CRow className="mb-4 g-3">
        <CCol sm={6} lg={3}><StatCard title="Total Products" value={stats.total.toLocaleString()} icon={<CIcon icon={cilTags}/>} gradient="linear-gradient(135deg, #17334e 0%, #0f2438 100%)" /></CCol>
        <CCol sm={6} lg={3}><StatCard title="Active Listings" value={stats.active.toLocaleString()} icon={<CIcon icon={cilCheckCircle}/>} gradient="linear-gradient(135deg, #2eb85c 0%, #1b9e3e 100%)" /></CCol>
        <CCol sm={6} lg={3}><StatCard title="Categories" value={stats.categories.toLocaleString()} icon={<CIcon icon={cilLayers}/>} gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" textColor="text-brand-navy"/></CCol>
        <CCol sm={6} lg={3}><StatCard title="Inactive" value={stats.inactive.toLocaleString()} icon={<CIcon icon={cilXCircle}/>} gradient="linear-gradient(135deg, #e55353 0%, #b21f2d 100%)" /></CCol>
      </CRow>

      {/* --- MAIN TABLE CARD --- */}
      <CCard className="mb-4 border-0 shadow-sm overflow-hidden">
        {/* COMMAND HEADER (Merged Filters) */}
        <CCardHeader className="bg-white p-3 border-bottom d-flex flex-wrap gap-3 align-items-center justify-content-between">
           <div className="d-flex gap-2 flex-grow-1 flex-wrap" style={{maxWidth: '1000px'}}>
               <div className="bg-light rounded px-3 py-2 d-flex align-items-center border" style={{minWidth: '250px'}}>
                  <CIcon icon={cilMagnifyingGlass} className="text-muted me-2"/>
                  <input id="productSearch" name="search" className="border-0 bg-transparent w-100" style={{outline: 'none', fontSize: '0.9rem'}} placeholder="Search parts..." value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}} />
               </div>
               <CFormSelect id="filterCategory" name="category" className="form-select-sm" style={{maxWidth: '160px', borderColor:'#e9ecef'}} value={cat} onChange={e=>{setCat(e.target.value); setPage(1)}}><option>All Categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</CFormSelect>
               <CFormSelect id="filterBrand" name="brand" className="form-select-sm" style={{maxWidth: '160px', borderColor:'#e9ecef'}} value={brd} onChange={e=>{setBrd(e.target.value); setPage(1)}}><option>All Brand</option>{brands.map(b=><option key={b} value={b}>{b}</option>)}</CFormSelect>
               <CFormSelect id="filterUnit" name="unit" className="form-select-sm" style={{maxWidth: '140px', borderColor:'#e9ecef'}} value={unit} onChange={e=>{setUnit(e.target.value); setPage(1)}}><option>All Units</option>{UOM_OPTIONS.map(u=><option key={u} value={u}>{u}</option>)}</CFormSelect>
               <CFormSelect id="filterStatus" name="status" className="form-select-sm" style={{maxWidth: '140px', borderColor:'#e9ecef'}} value={stat} onChange={e=>{setStat(e.target.value); setPage(1)}}><option>All Status</option><option>Active</option><option>Inactive</option></CFormSelect>
           </div>
        </CCardHeader>

        <div className="admin-table-container">
            <table className="admin-table">
                <thead className="bg-brand-navy text-white">
                    <tr>
                        <th className="ps-4 text-white" style={{width: '15%'}}>Part No.</th>
                        <th className="text-white" style={{width: '25%'}}>Product Details</th>
                        <th className="text-white" style={{width: '15%'}}>Category</th>
                        <th className="text-white" style={{width: '10%'}}>Brand</th>
                        <th className="text-end text-white" style={{width: '10%'}}>Price</th>
                        <th className="text-center text-white" style={{width: '5%'}}>Unit</th>
                        <th className="text-center text-white" style={{width: '10%'}}>Status</th>
                        <th className="text-end pe-4 text-white" style={{width: '10%'}}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan="8" className="text-center py-5"><CSpinner color="primary"/></td></tr> : 
                   products.length===0 ? <tr><td colSpan="8" className="text-center py-5 text-muted">No results.</td></tr> :
                   products.map(p => {
                     const img = getImageUrl(p.image);
                     return (
                       <tr key={p.product_id}>
                          <td className="ps-4">
                              <div className="d-flex flex-column">
                                  <span className="fw-bold text-brand-navy font-monospace">{p.product_id}</span>
                                  <div className="mt-1">{p.requires_serial ? <CBadge color="info" shape="rounded-pill" className="text-white border border-info px-2 py-1" style={{fontSize:'0.65rem'}}>SERIAL</CBadge> : <CBadge color="light" shape="rounded-pill" className="text-dark border px-2 py-1" style={{fontSize:'0.65rem'}}>STANDARD</CBadge>}</div>
                              </div>
                          </td>
                          <td>
                              <div className="d-flex align-items-center gap-3">
                                  <div className="product-thumbnail-container" style={{width:'45px', height:'45px', minWidth:'45px'}}>
                                      {img ? <img src={img} alt="" style={{width:'100%', height:'100%', objectFit:'contain'}}/> : <div className="placeholder-icon"><CIcon icon={cilImage} className="text-secondary opacity-50"/></div>}
                                  </div>
                                  <div className="fw-bold text-dark text-wrap" style={{maxWidth:'250px', fontSize:'0.95rem'}}>{p.name}</div>
                              </div>
                          </td>
                          <td><span className="badge bg-light text-dark border fw-normal px-2">{p.category}</span></td>
                          <td>{p.brand}</td>
                          <td className="text-end"><div className="fw-bold text-dark" style={{fontFamily:'Oswald'}}>₱{p.price?.toLocaleString()}</div></td>
                          <td className="text-center"><CTooltip content={UOM_MAP[p.unit_tag] || p.unit_tag}><CBadge color="info" shape="rounded-pill" className="px-2" style={{cursor: 'help'}}>{p.unit_tag || 'EA'}</CBadge></CTooltip></td>
                          
                          <td className="text-center">
                              {p.status === 'Active' ? 
                                <CBadge color="success" shape="rounded-pill" className="px-3 text-white">Active</CBadge> : 
                                <CBadge color="secondary" shape="rounded-pill" className="px-3 text-white">Inactive</CBadge>
                              }
                          </td>
                          
                          <td className="text-end pe-4">
                              <div className="d-flex justify-content-end gap-2">
                                <CTooltip content="Edit">
                                    <CButton size="sm" className="text-white shadow-sm d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', padding: 0, backgroundColor: '#17334e', borderColor: '#17334e'}} onClick={()=>handleEdit(p)}>
                                        <CIcon icon={cilPencil} size="sm"/>
                                    </CButton>
                                </CTooltip>
                                <CTooltip content="Delete">
                                    <CButton size="sm" color="danger" className="text-white shadow-sm d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', padding: 0}} onClick={()=>handleDelete(p)}>
                                        <CIcon icon={cilTrash} size="sm"/>
                                    </CButton>
                                </CTooltip>
                              </div>
                          </td>
                       </tr>
                     )
                   })}
                </tbody>
            </table>
        </div>
        
        <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
            <span className="small text-muted fw-semibold">Showing {products.length} of {total} items</span>
            <CPagination className="mb-0 justify-content-end">{renderPaginationItems()}</CPagination>
        </div>
      </CCard>

      <ProductFormModal visible={formVisible} productToEdit={editingProduct} categories={categories} brands={brands} onClose={()=>setFormVisible(false)} onSuccess={(m)=>{ loadData(); loadMeta(); setFormVisible(false); }} />
      <CModal visible={msg.show} onClose={()=>setMsg({...msg, show:false})}><CModalHeader className={`bg-${msg.color} text-white`}><CModalTitle className="font-oswald">{msg.title}</CModalTitle></CModalHeader><CModalBody className="py-4">{msg.text}</CModalBody><CModalFooter className="bg-light"><CButton color="secondary" onClick={()=>setMsg({...msg, show:false})}>Cancel</CButton><CButton color={msg.color} className="text-white" onClick={msg.confirm}>Confirm</CButton></CModalFooter></CModal>
    </CContainer>
  )
}

export default ProductPage