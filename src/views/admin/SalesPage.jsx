import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  CContainer, CFormInput, CFormSelect, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CInputGroup, CInputGroupText, CBadge, CSpinner, CFormCheck
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilCart, cilMagnifyingGlass, cilPlus, cilMinus, cilImage, cilUser, cilCheckCircle, 
  cilBarcode, cilReload, cilX, cilTruck, cilCreditCard, cilTrash, cilLockLocked
} from '@coreui/icons'
import { salesAPI, inventoryAPI, customersAPI, settingsAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'
import { generateSaleReceipt } from '../../utils/pdfGenerator'

import '../../styles/App.css'
import '../../styles/SalesPage.css' 

const ASSET_URL = 'http://localhost:5000'

const SalesPage = () => {
  // --- 1. CORE STATE ---
  const [searchQuery, setSearchQuery] = useState('')
  const [saleItems, setSaleItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState({})
  
  // --- 2. CUSTOMER STATE ---
  const [customerType, setCustomerType] = useState('new') 
  const [backendCustomers, setBackendCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const customerInputRef = useRef(null)
  
  // Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [addressDetails, setAddressDetails] = useState('') 
  const [landmark, setLandmark] = useState('') 
  const [region, setRegion] = useState('Manila') 
  const [saveClientChecked, setSaveClientChecked] = useState(true)

  // --- 3. TRANSACTION STATE ---
  const [paymentOption, setPaymentOption] = useState('')
  const [shippingOption, setShippingOption] = useState('In-Store Pickup')
  const [tenderedAmount, setTenderedAmount] = useState('')
  const [gcashRef, setGcashRef] = useState('')
  const [paymentSettings, setPaymentSettings] = useState({ cash_enabled: true, gcash_enabled: true, cod_enabled: true })

  // --- 4. MODAL & HELPERS STATE ---
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })
  const [serialModalOpen, setSerialModalOpen] = useState(false)
  const [selectedProductForSerial, setSelectedProductForSerial] = useState(null)
  const [availableSerials, setAvailableSerials] = useState([])
  const [tempSelectedSerials, setTempSelectedSerials] = useState([]) 
  const [quantities, setQuantities] = useState({}) 
  const [serialSearchTerm, setSerialSearchTerm] = useState('') 
  const [cartSerialModal, setCartSerialModal] = useState({ open: false, items: [], productName: '' })

  // --- HELPER FUNCTIONS ---
  const getTargetQty = (productId) => {
     if (!productId) return 1;
     return parseInt(quantities[productId] || 1);
  }

  const getSaleTotal = () => saleItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  const saleTotal = getSaleTotal()

  const isCompanyDeliveryAvailable = useMemo(() => saleTotal >= 5000, [saleTotal])
  
  const changeDue = (paymentOption === 'Cash' || paymentOption === 'GCash') && tenderedAmount 
    ? Math.max(0, Number(tenderedAmount) - saleTotal) : 0
  
  const isPaymentValid = useMemo(() => {
    if (saleItems.length === 0) return false
    if (paymentOption === 'Cash' || paymentOption === 'GCash') {
        return Number(tenderedAmount) >= saleTotal && (paymentOption === 'Cash' || !!gcashRef)
    }
    return true
  }, [saleItems, paymentOption, tenderedAmount, saleTotal, gcashRef])

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSavedCustomers = useMemo(() => {
    const searchLower = customerSearch.toLowerCase();
    if (!searchLower) return backendCustomers;
    return backendCustomers.filter(c =>
      (c.lastName || '').toLowerCase().includes(searchLower) ||
      (c.firstName || '').toLowerCase().includes(searchLower) ||
      (c.contactNumber || '').includes(searchLower)
    );
  }, [customerSearch, backendCustomers]);

  const filteredSerials = availableSerials.filter(sn => sn.serial_number.toLowerCase().includes(serialSearchTerm.toLowerCase()))
  
  const getProductImageUrl = (path) => (!path ? null : path.startsWith('http') ? path : `${ASSET_URL}${path.startsWith('/') ? path : '/' + path}`)

  // --- LIFECYCLE ---
  useEffect(() => { 
    fetchProductsAndInventory(); 
    fetchPaymentSettings(); 
    fetchBackendCustomers(); 
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerInputRef.current && !customerInputRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isCompanyDeliveryAvailable && shippingOption === 'Company Delivery') setShippingOption('In-Store Pickup');
    
    if (paymentOption === 'Cash on Delivery') {
       if (!isCompanyDeliveryAvailable) {
          setPaymentOption('');
          showMessage('Unavailable', "Order total is under ₱5,000. COD is unavailable.", 'warning');
       } else if (shippingOption === 'In-Store Pickup') {
          setShippingOption('Company Delivery'); 
       }
    }
  }, [paymentOption, shippingOption, isCompanyDeliveryAvailable]);

  // --- API CALLS ---
  const fetchProductsAndInventory = async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getProductsWithInventory();
      if (response.success) {
        const pData = response.data?.products || [];
        const mapped = pData.map(p => ({ ...p, stock: Number(p.stock || 0) }));
        setProducts(mapped);
        const invMap = {};
        mapped.forEach(p => { invMap[p.product_id] = { stock: p.stock, reorder_point: p.reorder_point || 10 } });
        setInventory(invMap);
      }
    } catch (err) { showMessage('Error', 'Failed to load inventory.', 'danger'); } 
    finally { setLoading(false); }
  }

  const fetchPaymentSettings = async () => {
    try {
      const res = await settingsAPI.get();
      if (res.success && res.data) {
        const s = res.data;
        setPaymentSettings({ cash_enabled: !!s.cash_enabled, gcash_enabled: !!s.gcash_enabled, cod_enabled: !!s.cod_enabled });
      }
    } catch (e) {}
  }

  const fetchBackendCustomers = async () => {
    try {
      const res = await customersAPI.getCustomers();
      if (res.success) {
          const rows = res.data || [];
          const mappedCustomers = rows.map((row, index) => {
             const fullName = row.customer_name || '';
             const parts = fullName.trim().split(' ').filter(Boolean);
             let first = fullName;
             let last = '';
             if (parts.length > 1) {
                last = parts[parts.length - 1];
                first = parts.slice(0, -1).join(' ');
             }
             return {
                id: `backend-${index}`,
                firstName: first,
                lastName: last,
                contactNumber: row.contact || '',
                address: row.address || '',
                landmark: '', 
             };
          });
          setBackendCustomers(mappedCustomers);
      }
    } catch (e) { console.error("Customer fetch error", e); }
  }

  // --- HANDLERS ---
  const showMessage = (title, message, color = 'info', onConfirm = null) => setMsgModal({ visible: true, title, message, color, onConfirm });
  const closeMsgModal = () => setMsgModal({ ...msgModal, visible: false });

  const handleClearClient = () => {
    setCustomerSearch(''); setFirstName(''); setLastName('');
    setContactNumber(''); setAddressDetails(''); setLandmark(''); setRegion('Manila'); 
    setIsCustomerDropdownOpen(false);
  }

  const handleSelectCustomer = (customer) => {
    setLastName(customer.lastName || ''); 
    setFirstName(customer.firstName || '');
    setContactNumber(customer.contactNumber || ''); 
    setAddressDetails(customer.address || ''); 
    setLandmark(''); 
    setRegion('Manila'); 
    setCustomerSearch(`${customer.lastName}, ${customer.firstName}`);
    setIsCustomerDropdownOpen(false);
  }

  const handleContactChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setContactNumber(val);
  }

  const handleQuantityInput = (productId, val) => {
    setQuantities(prev => ({ ...prev, [productId]: val }));
  }

  const handleAddProductClick = async (product) => {
    const qty = parseInt(quantities[product.product_id] || 1);
    if (qty < 1) return;
    
    const currentStock = products.find(p => p.product_id === product.product_id)?.stock || 0;
    if (currentStock < qty) return showMessage('Stock Error', `Only ${currentStock} units available.`, 'warning');

    if (product.requires_serial) {
      setSelectedProductForSerial(product); 
      setAvailableSerials([]); 
      setTempSelectedSerials([]); 
      setSerialSearchTerm(''); 
      setSerialModalOpen(true);
      try {
        const res = await serialNumberAPI.getAvailableSerials(product.product_id);
        if (res.success) {
           const inCartItem = saleItems.find(i => i.product_id === product.product_id);
           const usedSerials = inCartItem ? (inCartItem.serialNumbers || []) : [];
           setAvailableSerials((res.data || []).filter(s => !usedSerials.includes(s.serial_number)));
        }
      } catch (e) { setAvailableSerials([]); }
    } else {
      addToSale(product, qty);
    }
  }

  const toggleSerialSelection = (sn) => {
    const targetQty = getTargetQty(selectedProductForSerial?.product_id);
    if (tempSelectedSerials.includes(sn)) {
        setTempSelectedSerials(prev => prev.filter(s => s !== sn));
    } else {
        if (tempSelectedSerials.length < targetQty) {
            setTempSelectedSerials(prev => [...prev, sn]);
        }
    }
  }

  const confirmSerialAddition = () => {
    const targetQty = getTargetQty(selectedProductForSerial?.product_id);
    if (tempSelectedSerials.length !== targetQty) {
        return showMessage('Mismatch', `Please select exactly ${targetQty} serials.`, 'warning');
    }
    addToSale(selectedProductForSerial, targetQty, tempSelectedSerials);
    setSerialModalOpen(false);
  }

  const addToSale = (product, quantity, serials = []) => {
    const existing = saleItems.find(i => i.product_id === product.product_id);
    const newTotalQty = existing ? existing.quantity + quantity : quantity;
    
    if (product.stock < newTotalQty) {
        return showMessage('Stock Error', `Insufficient stock. Total exceeds ${product.stock}.`, 'warning');
    }

    const newItem = existing 
      ? { ...existing, quantity: newTotalQty, serialNumbers: [...(existing.serialNumbers || []), ...serials] }
      : { 
          product_id: product.product_id, 
          name: product.name, 
          brand: product.brand, 
          price: Number(product.price), 
          quantity: quantity, 
          serialNumbers: serials, 
          image: product.image, 
          requires_serial: product.requires_serial 
        };
    
    const newItems = existing 
        ? saleItems.map(i => i.product_id === product.product_id ? newItem : i) 
        : [...saleItems, newItem];
    setSaleItems(newItems);

    setProducts(prev => prev.map(p => 
        p.product_id === product.product_id 
        ? { ...p, stock: p.stock - quantity } 
        : p
    ));

    setQuantities(prev => ({ ...prev, [product.product_id]: 1 })); 
  }

  const removeFromSale = (productId) => {
    const itemToRemove = saleItems.find(i => i.product_id === productId);
    if (!itemToRemove) return;

    setProducts(prev => prev.map(p => 
        p.product_id === productId 
        ? { ...p, stock: p.stock + itemToRemove.quantity } 
        : p
    ));

    setSaleItems(prev => prev.filter(i => i.product_id !== productId));
  }

  // Cart Quantity Edit
  const setCartItemQuantity = (productId, val) => {
    const item = saleItems.find(i => i.product_id === productId);
    const productInTable = products.find(p => p.product_id === productId);
    if (!item || !productInTable) return;
    if (item.requires_serial) return; 

    const currentQty = item.quantity || 0;
    const inputQty = val === '' ? 0 : parseInt(val);
    if (inputQty < 0) return;

    const diff = inputQty - currentQty;
    if (diff === 0) return;
    if (diff > 0 && productInTable.stock < diff) return showMessage('Stock Limit', `Only ${productInTable.stock} units available.`, 'warning');

    const finalQty = val === '' ? '' : inputQty;
    setSaleItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: finalQty } : i));
    setProducts(prev => prev.map(p => p.product_id === productId ? { ...p, stock: p.stock - diff } : p));
  }

  const handleCartItemBlur = (productId) => {
      const item = saleItems.find(i => i.product_id === productId);
      if (item && (item.quantity === 0 || item.quantity === '')) setCartItemQuantity(productId, 1); 
  }

  const updateCartItemQuantity = (productId, change) => {
     const item = saleItems.find(i => i.product_id === productId);
     if (!item) return;
     setCartItemQuantity(productId, (item.quantity || 0) + change);
  }

  // Catalog Quantity Controls
  const handleQuantityChange = (productId, change) => {
    const currentQty = parseInt(quantities[productId] || 1);
    const product = products.find(p => p.product_id === productId);
    if (!product) return;
    let newQty = currentQty + change;
    if (newQty < 1) newQty = 1;
    if (newQty > product.stock) newQty = product.stock;
    setQuantities(prev => ({ ...prev, [productId]: newQty }));
  }

  const handlePaymentOptionChange = (val) => {
    if (val === 'Cash on Delivery' && !isCompanyDeliveryAvailable) {
        return showMessage('Unavailable', 'COD is only available for orders over ₱5,000.', 'warning');
    }
    setPaymentOption(val);
  }

  const confirmSale = async () => {
    if (saleItems.length === 0) return showMessage('Empty', 'Add items to cart first.', 'warning');
    if (!firstName || !lastName) return showMessage('Customer Info', 'Please enter Customer Name.', 'warning');
    
    const isDelivery = shippingOption === 'Company Delivery';
    if (isDelivery) {
        if (!addressDetails) return showMessage('Address Missing', 'Company Delivery requires a specific address.', 'warning');
        if (!landmark) return showMessage('Landmark Missing', 'Please provide a landmark.', 'warning');
        if (!contactNumber || contactNumber.length !== 11) return showMessage('Contact Invalid', 'Delivery requires a valid 11-digit contact number.', 'warning');
    }

    if (!paymentOption) return showMessage('Payment', 'Select a payment method.', 'warning');
    
    if (paymentOption === 'Cash' || paymentOption === 'GCash') {
        const paid = parseFloat(tenderedAmount || 0);
        if (Number.isNaN(paid) || paid < saleTotal) return showMessage('Payment Error', 'Paid amount is insufficient.', 'warning');
    }

    setSubmitting(true);
    try {
        const fullName = `${firstName} ${lastName}`.trim();
        const finalAddress = addressDetails ? `${addressDetails} (Landmark: ${landmark}), ${region}` : region;

        const payload = {
            customer_name: fullName,
            customer_first_name: firstName,
            customer_last_name: lastName,
            contact: contactNumber,
            address: finalAddress,
            items: saleItems.map(i => ({
                product_id: i.product_id,
                product_name: i.name,
                brand: i.brand,
                price: i.price,
                quantity: i.quantity,
                serialNumbers: i.serialNumbers || []
            })),
            total: saleTotal,
            payment: paymentOption,
            delivery_type: shippingOption,
            tendered: (paymentOption === 'Cash on Delivery') ? null : tenderedAmount,
            reference: paymentOption === 'GCash' ? gcashRef : null,
            status: (paymentOption === 'Cash on Delivery') ? 'Pending' : (shippingOption === 'In-Store Pickup' ? 'Completed' : 'Processing'),
            payment_status: (paymentOption === 'Cash on Delivery') ? 'Unpaid' : 'Paid',
            save_client: saveClientChecked && customerType === 'new'
        };

        const res = await salesAPI.createSale(payload);
        const saleNo = res?.data?.sale_number || 'N/A';

        try {
             const doc = await generateSaleReceipt({
                 saleNumber: saleNo,
                 customerName: fullName,
                 items: saleItems,
                 totalAmount: saleTotal,
                 paymentMethod: paymentOption,
                 tenderedAmount: (paymentOption === 'Cash on Delivery') ? saleTotal : parseFloat(tenderedAmount),
                 changeAmount: changeDue,
                 address: finalAddress,
                 shippingOption,
                 createdAt: new Date()
             });
             doc.save(`${saleNo}_receipt.pdf`);
        } catch (e) { console.error('Receipt Error', e); }

        showMessage('Success', `Transaction Complete! Sale #${saleNo}`, 'success', () => {
            window.location.reload();
        });

    } catch (e) {
        showMessage('Error', e.message || 'Transaction failed.', 'danger');
    } finally {
        setSubmitting(false);
    }
  }

  const modalTargetQty = selectedProductForSerial ? getTargetQty(selectedProductForSerial.product_id) : 1
  const modalRemaining = modalTargetQty - tempSelectedSerials.length

  return (
    <CContainer fluid className="px-4 py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
            <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily:'Oswald, sans-serif', letterSpacing:'0.5px'}}>SALES TERMINAL</h2>
            <div className="text-medium-emphasis fw-semibold">Point of Sale</div>
        </div>
        <button className="btn-brand btn-brand-danger" onClick={() => window.location.reload()}>
            <CIcon icon={cilReload} className="me-2"/> RESET
        </button>
      </div>

      <div className="sales-content">
        {/* CATALOG */}
        <div className="products-section shadow-sm">
          <div className="products-header bg-light">
            <h5 className="mb-0 fw-bold text-brand-navy" style={{fontFamily:'Oswald', fontSize:'1.1rem'}}>ITEM CATALOG</h5>
            <div className="brand-search-wrapper" style={{maxWidth:'300px'}}>
              <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass}/></span>
              <input className="brand-search-input" placeholder="Search Product..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} autoFocus/>
            </div>
          </div>
          <div className="products-table-container">
            <table className="admin-table">
              <thead className="bg-brand-navy text-white"><tr><th style={{width:'45%'}} className="ps-4 py-3">PRODUCT DETAILS</th><th className="text-end" style={{width:'15%'}}>PRICE</th><th className="text-center" style={{width:'10%'}}>STOCK</th><th className="text-center" style={{width:'15%'}}>QTY</th><th className="text-end pe-4" style={{width:'15%'}}>ACTION</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="5" className="text-center py-5"><CSpinner color="primary"/></td></tr> : filteredProducts.length===0 ? <tr><td colSpan="5" className="text-center py-5 text-muted fw-bold">No items found.</td></tr> : filteredProducts.map(p => {
                   const isStocked = p.stock > 0; const img = getProductImageUrl(p.image); const inputQty = quantities[p.product_id] || 1;
                   return (<tr key={p.product_id} className={!isStocked ? 'opacity-50 bg-light' : ''}><td className="ps-4 py-3"><div className="d-flex align-items-center gap-3"><div className="table-thumbnail-slot">{img ? <img src={img} className="table-thumbnail"/> : <CIcon icon={cilImage} className="text-secondary opacity-25"/>}</div><div><div className="text-brand-navy fw-bold text-truncate" style={{maxWidth:'200px'}}>{p.name}</div><div className="small text-muted d-flex align-items-center gap-1">{p.brand} {!!p.requires_serial && <CBadge color="info" className="ms-1">SERIALIZED</CBadge>}</div></div></div></td><td className="text-end fw-bold text-brand-navy fs-6">₱{Number(p.price).toLocaleString()}</td><td className={`text-center fw-bold fs-6 ${p.stock===0?'text-danger':p.stock<10?'text-warning':'text-success'}`}>{p.stock}</td><td className="text-center"><div className="d-flex align-items-center justify-content-center border rounded overflow-hidden" style={{width: '100px', margin:'0 auto'}}><button className="btn btn-light btn-sm px-2 py-0 border-end" disabled={!isStocked} onClick={() => handleQuantityChange(p.product_id, -1)}><CIcon icon={cilMinus} size="sm"/></button><input type="number" className="form-control form-control-sm text-center border-0 p-0 fw-bold bg-white" style={{width: '40px'}} min="1" max={p.stock} value={inputQty} onChange={(e) => handleQuantityInput(p.product_id, e.target.value)} disabled={!isStocked}/><button className="btn btn-light btn-sm px-2 py-0 border-start" disabled={!isStocked} onClick={() => handleQuantityChange(p.product_id, 1)}><CIcon icon={cilPlus} size="sm"/></button></div></td><td className="text-end pe-4"><button className="btn-brand btn-brand-primary btn-brand-sm" disabled={!isStocked} onClick={()=>handleAddProductClick(p)} style={{height:'36px'}}>ADD</button></td></tr>)
                 })}
              </tbody>
            </table>
          </div>
        </div>

        {/* POS PANEL */}
        <div className="right-panel shadow-sm">
          <div className="sale-header bg-brand-navy text-white d-flex justify-content-between align-items-center px-3 py-3"><div className="d-flex align-items-center gap-2"><CIcon icon={cilCart} className="text-brand-yellow"/><span className="fw-bold text-uppercase" style={{fontFamily:'Oswald', letterSpacing:'1px'}}>MANIFEST</span></div><span className="badge bg-brand-yellow text-brand-navy fw-bold">{saleItems.length} ITEMS</span></div>
          <div className="sale-items p-0">
            {saleItems.length === 0 ? <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-5"><div className="mb-3 p-3 bg-light rounded-circle"><CIcon icon={cilCart} size="4xl" className="opacity-25"/></div><h6 className="fw-bold text-uppercase">Transaction Empty</h6></div> : (
              <table className="table table-hover mb-0 align-middle"><thead className="bg-light text-muted small text-uppercase"><tr><th className="ps-3 py-2">Item</th><th className="text-center py-2">Qty</th><th className="text-end py-2 pe-3">Total</th><th style={{width:'40px'}}></th></tr></thead><tbody>{saleItems.map(item => (<tr key={item.product_id}><td className="ps-3 py-3"><div className="fw-bold text-brand-navy text-truncate" style={{maxWidth:'140px'}}>{item.name}</div>{!!item.requires_serial && (<button className="btn btn-sm btn-light border d-flex align-items-center gap-1 mt-1 py-0 px-2 text-brand-blue small fw-bold" onClick={()=>setCartSerialModal({open:true, items:item.serialNumbers, productName:item.name})}><CIcon icon={cilBarcode} size="sm"/> View Serials</button>)}</td><td className="text-center">{!!item.requires_serial ? <div className="fw-bold text-muted d-flex align-items-center justify-content-center gap-1 bg-light rounded px-2 py-1 border"><CIcon icon={cilLockLocked} size="sm"/> {item.quantity}</div> : <div className="d-flex align-items-center justify-content-center border rounded overflow-hidden"><button className="btn btn-light btn-sm px-2 py-0 border-end" onClick={()=>updateCartItemQuantity(item.product_id, -1)}><CIcon icon={cilMinus} size="sm"/></button><input type="number" className="form-control form-control-sm text-center border-0 p-0 h-100 fw-bold" style={{width: '40px', backgroundColor: 'transparent'}} value={item.quantity} onChange={(e) => setCartItemQuantity(item.product_id, e.target.value)} onBlur={() => handleCartItemBlur(item.product_id)}/><button className="btn btn-light btn-sm px-2 py-0 border-start" onClick={()=>updateCartItemQuantity(item.product_id, 1)}><CIcon icon={cilPlus} size="sm"/></button></div>}</td><td className="text-end fw-bold text-dark pe-3">₱{(item.price * item.quantity).toLocaleString()}</td><td className="text-end pe-2"><button className="btn btn-ghost-danger btn-sm p-1" onClick={()=>removeFromSale(item.product_id)}><CIcon icon={cilTrash}/></button></td></tr>))}</tbody></table>
            )}
          </div>
          
          {/* POS BOTTOM ANCHOR */}
          <div className="pos-bottom-anchor bg-white border-top">
            <div className="p-3 bg-light border-bottom">
               <div className="d-flex justify-content-between align-items-center mb-3"><h6 className="fw-bold text-brand-navy mb-0 d-flex align-items-center"><CIcon icon={cilUser} className="me-2 text-brand-blue"/>CLIENT INFO</h6><div className="btn-group"><button className={`btn-brand btn-brand-sm ${customerType==='new'?'btn-brand-primary':'btn-brand-secondary'}`} onClick={()=>{setCustomerType('new'); handleClearClient()}}>New</button><button className={`btn-brand btn-brand-sm ${customerType==='existing'?'btn-brand-primary':'btn-brand-secondary'}`} onClick={()=>{setCustomerType('existing'); handleClearClient()}}>Existing</button></div></div>
               {customerType === 'existing' && (<div className="position-relative mb-3" ref={customerInputRef}><div className="brand-search-wrapper" style={{height:'35px'}}><span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass}/></span><input className="brand-search-input" placeholder="Search Client Name..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); }} onFocus={() => setIsCustomerDropdownOpen(true)} autoComplete="off"/><button className="btn btn-sm text-danger" onClick={handleClearClient} title="Clear"><CIcon icon={cilX}/></button></div>{isCustomerDropdownOpen && (<div className="list-group position-absolute w-100 shadow-lg border-0 rounded-bottom" style={{zIndex:1000, maxHeight:'200px', overflowY:'auto', top:'100%'}}>{filteredSavedCustomers.length === 0 ? <div className="list-group-item small text-muted p-3 text-center">No matches found.</div> : filteredSavedCustomers.map(c => (<button key={c.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-3 py-2" onClick={()=>handleSelectCustomer(c)}><div className="fw-bold text-brand-navy">{c.lastName}, {c.firstName}</div><div className="small text-muted">{c.contactNumber}</div></button>))}</div>)}</div>)}
               <div className="row g-2 mb-2"><div className="col-6"><input className="form-control" placeholder="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} disabled={customerType==='existing'}/></div><div className="col-6"><input className="form-control" placeholder="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} disabled={customerType==='existing'}/></div></div><div className="row g-2 mb-2"><div class="col-6"><input class="form-control" placeholder={shippingOption === 'Company Delivery' ? "Contact (Required)" : "Contact (Optional)"} value={contactNumber} onChange={handleContactChange} maxLength={11} disabled={customerType==='existing'}/></div><div class="col-6"><select class="form-select" value={shippingOption} onChange={e=>setShippingOption(e.target.value)}><option value="In-Store Pickup">In-Store Pickup</option><option value="Company Delivery" disabled={!isCompanyDeliveryAvailable}>Company Delivery</option></select></div></div>{shippingOption === 'Company Delivery' && (<><div className="mb-2"><input className="form-control" placeholder="House No. / Street / Barangay" value={addressDetails} onChange={e=>setAddressDetails(e.target.value)} disabled={customerType==='existing'}/></div><div className="row g-2 mb-2"><div className="col-6"><select className="form-select" value={region} onChange={e=>setRegion(e.target.value)} disabled={customerType==='existing'}><option value="Manila">Manila</option><option value="Laguna">Laguna</option><option value="Bulacan">Bulacan</option></select></div><div className="col-6"><input className="form-control" placeholder="Landmark (Required)" value={landmark} onChange={e=>setLandmark(e.target.value)} disabled={customerType==='existing'}/></div></div></>)}{customerType === 'new' && (<div className="d-flex justify-content-between align-items-center mt-2"><div className="d-flex align-items-center"><CFormCheck id="saveClient" checked={saveClientChecked} onChange={e => setSaveClientChecked(e.target.checked)}/><label htmlFor="saveClient" className="small text-muted ms-2 cursor-pointer select-none">Save this client?</label></div><button className="btn btn-xs text-danger fw-bold text-uppercase" onClick={handleClearClient} style={{fontSize:'0.75rem'}}><CIcon icon={cilTrash} size="sm" className="me-1"/> Clear Details</button></div>)}</div>
            <div className="p-3 bg-white"><div className="row g-3 mb-3"><div className="col-12"><label className="small fw-bold text-brand-navy mb-1 d-block text-uppercase"><CIcon icon={cilCreditCard} className="me-1"/> PAYMENT</label><select className="brand-select w-100" value={paymentOption} onChange={e=>handlePaymentOptionChange(e.target.value)}><option value="" disabled>Select Method</option>{paymentSettings.cash_enabled && <option value="Cash">Cash</option>}{paymentSettings.gcash_enabled && <option value="GCash">GCash</option>}{paymentSettings.cod_enabled && <option value="Cash on Delivery" disabled={!isCompanyDeliveryAvailable}>Cash on Delivery</option>}</select></div></div>{(paymentOption === 'Cash' || paymentOption === 'GCash') && (<div className="mb-2"><label className="small fw-bold text-muted mb-1">AMOUNT PAID</label><div className="input-group input-group-lg border rounded overflow-hidden"><span className="input-group-text bg-light border-0 text-muted fw-bold px-3">₱</span><input type="number" className="form-control border-0 fw-bold text-end fs-4 text-brand-navy" placeholder="0.00" value={tenderedAmount} onChange={e=>setTenderedAmount(e.target.value)}/></div></div>)}{paymentOption === 'GCash' && (<div className="mb-3"><label className="small fw-bold text-muted mb-1">REFERENCE NO.</label><input className="form-control border-2" placeholder="Enter GCash Ref No." value={gcashRef} onChange={e=>setGcashRef(e.target.value)}/></div>)}{(paymentOption === 'Cash' || paymentOption === 'GCash') && changeDue > 0 && (<div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2"><div className="small fw-bold text-success">CHANGE DUE</div><div className="fw-bold text-success fs-5">₱{changeDue.toLocaleString()}</div></div>)}<div className="d-flex justify-content-between align-items-end mb-3 pt-2 border-top"><div><div className="text-uppercase small fw-bold text-muted">TOTAL AMOUNT</div></div><div className="display-total text-brand-navy lh-1" style={{fontSize:'2.2rem', fontFamily:'Oswald'}}>₱{saleTotal.toLocaleString()}</div></div><button className={`btn-brand w-100 ${isPaymentValid ? 'btn-brand-success' : 'btn-brand-outline'}`} disabled={submitting || !isPaymentValid} onClick={confirmSale} style={{height:'55px', fontSize:'1.1rem'}}>{submitting ? <CSpinner size="sm"/> : isPaymentValid ? 'COMPLETE TRANSACTION' : 'ENTER PAYMENT DETAILS'}</button></div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <CModal visible={serialModalOpen} onClose={()=>setSerialModalOpen(false)} alignment="center" backdrop="static"><CModalHeader className="bg-brand-navy text-white"><CModalTitle className="text-white" style={{fontFamily:'Oswald'}}>SELECT SERIAL NUMBERS</CModalTitle></CModalHeader><CModalBody><div className="mb-3 position-relative"><div className="brand-search-wrapper" style={{height:'40px'}}><span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass}/></span><input className="brand-search-input" placeholder="Type to filter serials..." value={serialSearchTerm} onChange={e=>setSerialSearchTerm(e.target.value)} autoFocus/></div></div><div className="d-flex justify-content-between align-items-center mb-2 small"><span className="text-muted">Target: <strong className="text-dark">{modalTargetQty}</strong></span><span className={modalRemaining === 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>{tempSelectedSerials.length} Selected</span></div><div className="list-group border" style={{maxHeight:'250px', overflowY:'auto'}}>{filteredSerials.length === 0 ? <div className="p-4 text-center text-muted">No serials found.</div> : filteredSerials.map(sn => { const isSelected = tempSelectedSerials.includes(sn.serial_number); const isDisabled = !isSelected && tempSelectedSerials.length >= modalTargetQty; return (<button key={sn.serial_number} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${isSelected?'serial-item-selected':'bg-white border-bottom'}`} onClick={()=>toggleSerialSelection(sn.serial_number)} disabled={isDisabled}><span className="font-monospace fw-bold">{sn.serial_number}</span>{isSelected && <CIcon icon={cilCheckCircle}/>}</button>)})}</div></CModalBody><CModalFooter><button className="btn-brand btn-brand-outline btn-brand-sm" onClick={()=>setSerialModalOpen(false)}>Cancel</button><button className="btn-brand btn-brand-primary btn-brand-sm" disabled={modalRemaining !== 0} onClick={confirmSerialAddition}>CONFIRM SELECTION</button></CModalFooter></CModal>
      <CModal visible={cartSerialModal.open} onClose={()=>setCartSerialModal({...cartSerialModal, open:false})} alignment="center" size="sm"><CModalHeader className="bg-brand-navy"><CModalTitle className="fs-6 fw-bold text-white">Allocated Serials</CModalTitle></CModalHeader><CModalBody className="p-0"><ul className="list-group list-group-flush">{cartSerialModal.items.map((sn,i)=><li key={i} className="list-group-item py-2 px-3 small font-monospace text-muted"><CIcon icon={cilBarcode} className="me-2 text-brand-blue"/>{sn}</li>)}</ul></CModalBody><CModalFooter><button className="btn-brand btn-brand-outline btn-brand-sm" onClick={()=>setCartSerialModal({...cartSerialModal, open:false})}>Close</button></CModalFooter></CModal>
      <CModal visible={msgModal.visible} onClose={closeMsgModal} alignment="center"><CModalHeader className={`bg-${msgModal.color === 'danger' ? 'danger' : 'brand-navy'} text-white`}><CModalTitle className="text-white" style={{fontFamily:'Oswald'}}>{msgModal.title}</CModalTitle></CModalHeader><CModalBody className="p-4 fs-6">{msgModal.message}</CModalBody><CModalFooter><button className="btn-brand btn-brand-outline" onClick={closeMsgModal}>Close</button>{msgModal.onConfirm && <button className="btn-brand btn-brand-primary" onClick={msgModal.onConfirm}>Confirm</button>}</CModalFooter></CModal>
    </CContainer>
  )
}

export default SalesPage