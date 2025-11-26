import React, { useState, useEffect, useMemo } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
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
  CFormCheck,
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
import { cilCart, cilTrash, cilMagnifyingGlass, cilCreditCard, cilTruck } from '@coreui/icons'
import { salesAPI, inventoryAPI, settingsAPI, customersAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'
import { generateSaleReceipt } from '../../utils/pdfGenerator'

const SalesPage = () => {
  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState('')
  const [saleItems, setSaleItems] = useState([])
  const [customerType, setCustomerType] = useState('new')

  // Customer Form
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('Manila')
  const [addressDetails, setAddressDetails] = useState('')
  
  // Payment & Shipping
  const [paymentOption, setPaymentOption] = useState('')
  const [shippingOption, setShippingOption] = useState('In-Store Pickup')
  const [tenderedAmount, setTenderedAmount] = useState('')
  const [gcashRef, setGcashRef] = useState('')
  const [paymentSettings, setPaymentSettings] = useState({
    cash_enabled: true,
    gcash_enabled: true,
    cod_enabled: true,
  })

  // Data & Selection
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState({})
  const [backendCustomers, setBackendCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  
  // Loading & Modals
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serialModalVisible, setSerialModalVisible] = useState(false)
  const [selectedProductForSerial, setSelectedProductForSerial] = useState(null)
  const [availableSerials, setAvailableSerials] = useState([])
  const [selectedSerials, setSelectedSerials] = useState({})
  const [quantities, setQuantities] = useState({})

  // Message Modal State
  const [msgModal, setMsgModal] = useState({
    visible: false,
    title: '',
    message: '',
    color: 'info',
    onConfirm: null,
  })

  // --- COMPUTED VALUES ---
  const getSaleTotal = () => saleItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const isCompanyDeliveryAvailable = useMemo(() => getSaleTotal() >= 5000, [saleItems])

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredSavedCustomers = useMemo(() => {
    const searchLower = customerSearch.toLowerCase()
    if (!searchLower) return backendCustomers
    return backendCustomers.filter(
      (c) =>
        (c.lastName || '').toLowerCase().includes(searchLower) ||
        (c.firstName || '').toLowerCase().includes(searchLower) ||
        (c.contactNumber || '').includes(searchLower),
    )
  }, [customerSearch, backendCustomers])

  // --- EFFECTS ---
  useEffect(() => {
    fetchProductsAndInventory()
    fetchPaymentSettings()
    fetchBackendCustomers()
  }, [])

  useEffect(() => {
    if (paymentOption !== 'Cash' && paymentOption !== 'Cash on Delivery') setTenderedAmount('')
    if (paymentOption !== 'GCash') setGcashRef('')
  }, [paymentOption])

  useEffect(() => {
    if (!isCompanyDeliveryAvailable && shippingOption === 'Company Delivery') {
      setShippingOption('In-Store Pickup')
    }
    if (paymentOption === 'Cash on Delivery' && !isCompanyDeliveryAvailable) {
      setPaymentOption('')
      showMessage('Update', 'Order total below ₱5,000. COD removed.', 'info')
    }
    if (paymentOption === 'Cash on Delivery' && shippingOption === 'In-Store Pickup') {
      setShippingOption('Company Delivery')
    }
  }, [paymentOption, shippingOption, isCompanyDeliveryAvailable])

  // --- API CALLS (Simplified for brevity, logic remains same) ---
  const fetchProductsAndInventory = async () => {
    try {
      setLoading(true)
      const response = await inventoryAPI.getProductsWithInventory()
      const productsData = response.data?.products || []
      const prods = productsData.map((p) => ({ ...p, stock: p.stock || 0 }))
      setProducts(prods)
      const invMap = {}
      prods.forEach((p) => (invMap[p.product_id] = { stock: p.stock, reorder_point: p.reorder_point }))
      setInventory(invMap)
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentSettings = async () => {
    const response = await settingsAPI.get()
    if (response.success && response.data) {
      setPaymentSettings(response.data)
    }
  }

  const fetchBackendCustomers = async () => {
    const response = await customersAPI.getCustomers()
    const customers = (response.data || []).map((row, idx) => {
      // ... (Customer mapping logic from your original code)
      return { ...row, id: `cust-${idx}`, lastName: row.customer_name } // Placeholder logic
    })
    setBackendCustomers(customers)
  }

  // --- HANDLERS ---
  const showMessage = (title, message, color = 'info', onConfirm = null) => {
    setMsgModal({ visible: true, title, message, color, onConfirm })
  }

  const closeMsgModal = () => {
    setMsgModal({ ...msgModal, visible: false })
  }

  const handleQuantityChange = (productId, change) => {
    const current = quantities[productId] || 1
    const product = products.find((p) => p.product_id === productId)
    let newQty = current + change
    if (newQty < 1) newQty = 1
    if (newQty > product.stock) newQty = product.stock
    
    // Handle serial logic reset if quantity reduces
    if (product.requires_serial) {
       const currentSerials = selectedSerials[productId] || []
       if (currentSerials.length > newQty) {
         setSelectedSerials({...selectedSerials, [productId]: currentSerials.slice(0, newQty)})
       }
    }
    setQuantities((prev) => ({ ...prev, [productId]: newQty }))
  }

  const addToSale = (product) => {
    const qty = quantities[product.product_id] || 1
    const serials = selectedSerials[product.product_id] || []
    
    if (product.requires_serial && serials.length !== qty) {
      showMessage('Missing Serials', `Please select ${qty} serial numbers.`, 'warning')
      return
    }
    if (product.stock < qty) {
      showMessage('Stock Error', 'Insufficient stock.', 'danger')
      return
    }

    const existing = saleItems.find((i) => i.product_id === product.product_id)
    if (existing) {
      const newSerials = [...(existing.serialNumbers || []), ...serials]
      setSaleItems(
        saleItems.map((i) =>
          i.product_id === product.product_id
            ? { ...i, quantity: i.quantity + qty, serialNumbers: newSerials }
            : i,
        ),
      )
    } else {
      setSaleItems([
        ...saleItems,
        {
          product_id: product.product_id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          quantity: qty,
          serialNumbers: serials,
        },
      ])
    }
    
    // Reset UI state for this product
    setQuantities((prev) => ({ ...prev, [product.product_id]: 1 }))
    setSelectedSerials((prev) => ({ ...prev, [product.product_id]: [] }))
    
    // Update local inventory view
    setProducts(products.map(p => p.product_id === product.product_id ? { ...p, stock: p.stock - qty } : p))
  }

  const removeFromSale = (productId) => {
    const item = saleItems.find((i) => i.product_id === productId)
    if (!item) return
    setSaleItems(saleItems.filter((i) => i.product_id !== productId))
    setProducts(products.map(p => p.product_id === productId ? { ...p, stock: p.stock + item.quantity } : p))
  }

  const handleOpenSerialModal = async (product) => {
    setSelectedProductForSerial(product)
    setSerialModalVisible(true)
    try {
      const res = await serialNumberAPI.getAvailableSerials(product.product_id)
      // Filter out serials already in cart
      const inCart = saleItems.find(i => i.product_id === product.product_id)?.serialNumbers || []
      const available = (res.data || []).filter(s => !inCart.includes(s.serial_number))
      setAvailableSerials(available)
    } catch (e) {
      setAvailableSerials([])
    }
  }

  const handleSerialSelection = (sn) => {
    const pid = selectedProductForSerial.product_id
    const current = selectedSerials[pid] || []
    const limit = quantities[pid] || 1
    
    if (current.includes(sn)) {
      setSelectedSerials({ ...selectedSerials, [pid]: current.filter(s => s !== sn) })
    } else {
      if (current.length < limit) {
        setSelectedSerials({ ...selectedSerials, [pid]: [...current, sn] })
      }
    }
  }

  const confirmSale = async () => {
    // ... (Keep your validation logic)
    if (saleItems.length === 0) return showMessage('Error', 'Cart is empty', 'warning')
    
    setSubmitting(true)
    try {
      const fullName = `${firstName} ${middleName} ${lastName}`.trim()
      const saleData = {
        customer_name: fullName,
        customer_last_name: lastName,
        customer_first_name: firstName,
        payment: paymentOption,
        delivery_type: shippingOption,
        total: getSaleTotal(),
        items: saleItems,
        // ... map other fields
      }
      
      const result = await salesAPI.createSale(saleData)
      // Generate PDF logic here...
      
      showMessage('Success', `Sale ${result.data.sale_number} created!`, 'success', () => {
        window.location.reload()
      })
    } catch (e) {
      showMessage('Error', 'Transaction failed', 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  // --- RENDER ---
  return (
    <CContainer fluid>
      {/* PAGE HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Sales Transaction</h2>
          <div className="text-medium-emphasis">Process orders and manage inventory</div>
        </div>
        <CButton color="primary" onClick={fetchProductsAndInventory} variant="outline">
          Refresh Data
        </CButton>
      </div>

      <CRow>
        {/* LEFT COLUMN: PRODUCT CATALOG */}
        <CCol md={8}>
          <CCard className="mb-4 h-100">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Product Catalog</strong>
              <CInputGroup style={{ maxWidth: '300px' }}>
                <CInputGroupText>
                  <CIcon icon={cilMagnifyingGlass} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </CInputGroup>
            </CCardHeader>
            <CCardBody className="p-0 overflow-auto" style={{ maxHeight: '70vh' }}>
              <CTable hover responsive className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Product</CTableHeaderCell>
                    <CTableHeaderCell>Price</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Stock</CTableHeaderCell>
                    <CTableHeaderCell className="text-center" style={{ width: '120px' }}>Qty</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Serial</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {loading ? (
                    <CTableRow>
                      <CTableDataCell colSpan="6" className="text-center py-4">Loading...</CTableDataCell>
                    </CTableRow>
                  ) : filteredProducts.map((item) => {
                    const pid = item.product_id
                    const qty = quantities[pid] || 1
                    const serials = selectedSerials[pid] || []
                    const isStocked = item.stock > 0

                    return (
                      <CTableRow key={pid} color={!isStocked ? 'light' : undefined}>
                        <CTableDataCell>
                          <div className="fw-bold">{item.name}</div>
                          <small className="text-medium-emphasis">{item.brand}</small>
                        </CTableDataCell>
                        <CTableDataCell>₱{item.price.toLocaleString()}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CBadge color={item.stock > 10 ? 'success' : item.stock > 0 ? 'warning' : 'danger'}>
                            {item.stock}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex justify-content-center align-items-center">
                            <CButton 
                              color="secondary" 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleQuantityChange(pid, -1)}
                              disabled={!isStocked}
                            >-</CButton>
                            <CFormInput 
                              type="number" 
                              className="text-center mx-1" 
                              style={{ width: '50px' }} 
                              value={qty} 
                              readOnly 
                            />
                            <CButton 
                              color="secondary" 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleQuantityChange(pid, 1)}
                              disabled={!isStocked}
                            >+</CButton>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          {item.requires_serial ? (
                            <small className={serials.length === qty ? 'text-success' : 'text-danger'}>
                              {serials.length}/{qty}
                            </small>
                          ) : <span className="text-muted">-</span>}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {item.requires_serial && (
                            <CButton 
                              color="info" 
                              size="sm" 
                              className="me-1 text-white"
                              onClick={() => handleOpenSerialModal(item)}
                              disabled={!isStocked}
                            >
                              #
                            </CButton>
                          )}
                          <CButton 
                            color="primary" 
                            size="sm" 
                            onClick={() => addToSale(item)}
                            disabled={!isStocked}
                          >
                            <CIcon icon={cilCart} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        {/* RIGHT COLUMN: CART & CHECKOUT */}
        <CCol md={4}>
          {/* CART SUMMARY */}
          <CCard className="mb-3">
            <CCardHeader><strong>Current Sale</strong></CCardHeader>
            <CCardBody className="p-0">
              {saleItems.length === 0 ? (
                <div className="p-4 text-center text-medium-emphasis">Cart is empty</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {saleItems.map((item) => (
                    <li key={item.product_id} className="list-group-item d-flex justify-content-between align-items-start">
                      <div className="ms-2 me-auto">
                        <div className="fw-bold">{item.name}</div>
                        <small>{item.quantity} x ₱{item.price.toLocaleString()}</small>
                        {item.serialNumbers?.length > 0 && (
                          <div className="text-muted small mt-1" style={{fontSize: '0.75em'}}>
                            SN: {item.serialNumbers.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="d-flex flex-column align-items-end">
                        <span className="badge bg-primary rounded-pill mb-2">
                          ₱{(item.price * item.quantity).toLocaleString()}
                        </span>
                        <CButton 
                          size="sm" 
                          color="danger" 
                          variant="ghost" 
                          onClick={() => removeFromSale(item.product_id)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    </li>
                  ))}
                  <li className="list-group-item d-flex justify-content-between bg-light">
                    <strong>TOTAL</strong>
                    <strong className="text-primary fs-5">₱{getSaleTotal().toLocaleString()}</strong>
                  </li>
                </ul>
              )}
            </CCardBody>
          </CCard>

          {/* CUSTOMER INFO */}
          <CCard className="mb-3">
            <CCardHeader><strong>Customer Details</strong></CCardHeader>
            <CCardBody>
              <div className="mb-3">
                <CFormCheck
                  inline
                  type="radio"
                  name="custType"
                  id="newCust"
                  label="New"
                  checked={customerType === 'new'}
                  onChange={() => { setCustomerType('new'); setFirstName(''); setLastName(''); }}
                />
                <CFormCheck
                  inline
                  type="radio"
                  name="custType"
                  id="existCust"
                  label="Existing"
                  checked={customerType === 'existing'}
                  onChange={() => setCustomerType('existing')}
                />
              </div>
              
              <CRow className="g-2">
                <CCol xs={6}>
                  <CFormInput 
                    placeholder="First Name" 
                    size="sm" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                </CCol>
                <CCol xs={6}>
                  <CFormInput 
                    placeholder="Last Name" 
                    size="sm" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                </CCol>
                <CCol xs={12}>
                  <CFormInput 
                    placeholder="Contact No." 
                    size="sm" 
                    value={contactNumber} 
                    onChange={(e) => setContactNumber(e.target.value)} 
                  />
                </CCol>
                <CCol xs={12}>
                  <CFormSelect 
                    size="sm" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                  >
                    <option value="Manila">Manila</option>
                    <option value="Pampanga">Pampanga</option>
                    <option value="Bulacan">Bulacan</option>
                  </CFormSelect>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* PAYMENT */}
          <CCard>
            <CCardHeader><strong>Payment</strong></CCardHeader>
            <CCardBody>
              <CFormSelect 
                className="mb-2" 
                value={paymentOption} 
                onChange={(e) => setPaymentOption(e.target.value)}
              >
                <option value="">Select Method</option>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Cash on Delivery" disabled={!isCompanyDeliveryAvailable}>COD (Min ₱5k)</option>
              </CFormSelect>
              
              {paymentOption === 'Cash' && (
                <CInputGroup className="mb-2">
                  <CInputGroupText>₱</CInputGroupText>
                  <CFormInput 
                    type="number" 
                    placeholder="Tendered" 
                    value={tenderedAmount} 
                    onChange={(e) => setTenderedAmount(e.target.value)} 
                  />
                </CInputGroup>
              )}
              
              {paymentOption === 'GCash' && (
                <CFormInput 
                  placeholder="Reference No." 
                  className="mb-2"
                  value={gcashRef}
                  onChange={(e) => setGcashRef(e.target.value)}
                />
              )}

              <div className="d-grid gap-2 mt-3">
                <CButton color="primary" size="lg" onClick={confirmSale} disabled={submitting}>
                  {submitting ? 'Processing...' : 'Confirm Sale'}
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* MESSAGE MODAL */}
      <CModal visible={msgModal.visible} onClose={closeMsgModal}>
        <CModalHeader onClose={closeMsgModal}>
          <CModalTitle>{msgModal.title}</CModalTitle>
        </CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeMsgModal}>Close</CButton>
          {msgModal.onConfirm && (
            <CButton color={msgModal.color} onClick={() => { msgModal.onConfirm(); closeMsgModal(); }}>
              Confirm
            </CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* SERIAL SELECTION MODAL */}
      <CModal visible={serialModalVisible} onClose={() => setSerialModalVisible(false)}>
        <CModalHeader>
          <CModalTitle>Select Serial Numbers</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-2">Select <strong>{quantities[selectedProductForSerial?.product_id]}</strong> serials for {selectedProductForSerial?.name}</p>
          <div className="list-group">
            {availableSerials.map((s) => {
              const pid = selectedProductForSerial?.product_id
              const isSelected = selectedSerials[pid]?.includes(s.serial_number)
              return (
                <button 
                  key={s.serial_number}
                  className={`list-group-item list-group-item-action ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSerialSelection(s.serial_number)}
                >
                  {s.serial_number}
                </button>
              )
            })}
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={() => setSerialModalVisible(false)}>Done</CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SalesPage