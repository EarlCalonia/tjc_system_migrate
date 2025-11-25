import React, { useState, useEffect, useRef } from 'react';
// Navbar import removed
import { BsSearch, BsPlus, BsPencil, BsTrash } from 'react-icons/bs';
import '../../styles/ProductPage.css';
import { productAPI } from '../../utils/api.js';
import { serialNumberAPI } from '../../utils/serialNumberApi.js';

// --- CUSTOM MESSAGE BOX COMPONENT ---
const MessageBox = ({ isOpen, title, message, type, onClose, onConfirm }) => {
  if (!isOpen) return null;

  let headerColor = '#f8f9fa';
  let titleColor = '#2c3e50';
  
  if (type === 'error') {
    headerColor = '#fee2e2';
    titleColor = '#b91c1c';
  } else if (type === 'success') {
    headerColor = '#dcfce7';
    titleColor = '#166534';
  } else if (type === 'warning') {
    headerColor = '#fff7ed';
    titleColor = '#c2410c';
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '90%', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="modal-header" style={{ backgroundColor: headerColor, borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '15px 20px' }}>
          <h3 style={{ color: titleColor, fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>{title}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body" style={{ padding: '25px 20px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div className="modal-actions" style={{ padding: '15px 20px', backgroundColor: '#f9fafb' }}>
          {onConfirm ? (
            <>
              <button onClick={onClose} className="cancel-btn">Cancel</button>
              <button 
                onClick={() => { onConfirm(); onClose(); }} 
                className="confirm-btn"
                style={{ backgroundColor: type === 'error' || type === 'warning' ? '#dc3545' : 'var(--color-primary)' }}
              >
                Confirm
              </button>
            </>
          ) : (
            <button onClick={onClose} className="confirm-btn" style={{ marginLeft: 'auto' }}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductPage = () => {
  // --- State ---
  const [products, setProducts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedBrand, setSelectedBrand] = useState('All Brand');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const [isCheckingSerials, setIsCheckingSerials] = useState(false);
  const [hasUnremovableSerials, setHasUnremovableSerials] = useState(false);

  // --- Message Box State ---
  const [msgBox, setMsgBox] = useState({
    isOpen: false, title: '', message: '', type: 'info', onConfirm: null
  });

  const showMessage = (title, message, type = 'info', onConfirm = null) => {
    setMsgBox({ isOpen: true, title, message, type, onConfirm });
  };

  const closeMessage = () => {
    setMsgBox(prev => ({ ...prev, isOpen: false }));
  };
  
  // Pagination constant
  const itemsPerPage = 10;
  const statuses = ['Active', 'Inactive'];

  // --- Initialization ---
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    
    const initData = async () => {
      await loadProducts();
      await new Promise(r => setTimeout(r, 150));
      await loadCategoriesAndBrands();
    };
    initData();
  }, []);

  // Retry helper
  const withRetry = async (fn, attempt = 0) => {
    try {
      return await fn();
    } catch (e) {
      const is429 = (e.message || '').toLowerCase().includes('too many requests');
      if (is429 && attempt < 3) {
        const delay = (attempt + 1) * 600;
        await new Promise(r => setTimeout(r, delay));
        return withRetry(fn, attempt + 1);
      }
      throw e;
    }
  };

  // --- Load Products (Server-Side Pagination) ---
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory && selectedCategory !== 'All Categories') filters.category = selectedCategory;
      if (selectedBrand && selectedBrand !== 'All Brand') filters.brand = selectedBrand;
      if (selectedStatus && selectedStatus !== 'All Status') filters.status = selectedStatus;

      const response = await withRetry(() => productAPI.getProducts(filters));
      
      if (response.success) {
        setProducts(response.data.products || []);
        
        const backendTotal = 
            response.data.pagination?.totalProducts || 
            response.data.total ||                     
            response.data.products.length;             
            
        setTotalItems(backendTotal); 
      } else {
        setError('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setError(error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesAndBrands = async () => {
    try {
      const categoriesResponse = await withRetry(() => productAPI.getCategories());
      if (categoriesResponse.success) setCategories(categoriesResponse.data || []);
      
      await new Promise(r => setTimeout(r, 150));
      
      const brandsResponse = await withRetry(() => productAPI.getBrands());
      if (brandsResponse.success) setBrands(brandsResponse.data || []);
    } catch (error) {
      console.error('Error loading categories/brands:', error);
    }
  };

  // --- Pagination Calculations (Server-Side Logic) ---
  const currentProducts = products; 
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const displayStartIndex = (currentPage - 1) * itemsPerPage;
  const displayEndIndex = Math.min(displayStartIndex + itemsPerPage, totalItems);

  // --- Effects ---
  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, selectedCategory, selectedBrand, selectedStatus, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, selectedStatus]);

  // --- Handlers ---
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      document.querySelector('.table-container')?.scrollTo(0,0);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setIsCheckingSerials(false);
    setHasUnremovableSerials(false);
  };

  const handleAddProduct = () => {
    setIsAddMode(true);
    setSelectedProduct({
      name: '', brand: '', category: '', price: 0, status: 'Active',
      description: '', vehicle_compatibility: '', image: null, requires_serial: false
    });
    setIsModalOpen(true);
    setHasUnremovableSerials(false);
    setIsCheckingSerials(false);
  };

  const handleEditProduct = async (product) => {
    setIsAddMode(false);
    setSelectedProduct({ 
      ...product, 
      originalDescription: product.description || '',
      requires_serial: !!product.requires_serial
    });
    setIsModalOpen(true);
    
    if (!!product.requires_serial) {
        try {
            setIsCheckingSerials(true);
            setHasUnremovableSerials(false);
            const response = await serialNumberAPI.getAllSerials(product.product_id);
            if (response.success && response.data) {
                const soldOrDefectiveExists = response.data.some(s => s.status === 'sold' || s.status === 'defective');
                setHasUnremovableSerials(soldOrDefectiveExists);
            }
        } catch (error) {
            console.error("Error checking serial numbers:", error);
        } finally {
            setIsCheckingSerials(false);
        }
    }
  };

  const handleDeleteClick = (product) => {
    showMessage(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      'warning',
      () => processDeleteProduct(product)
    );
  };

  const processDeleteProduct = async (product) => {
    try {
      const response = await productAPI.deleteProduct(product.id); 
      if (response.success) {
        showMessage('Success', 'Product deleted successfully', 'success');
        await loadProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showMessage('Delete Failed', error.message || 'Unknown error', 'error');
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      
      Object.keys(selectedProduct).forEach(key => {
        if (key === 'image') {
            if (selectedProduct.image instanceof File) formData.append('image', selectedProduct.image);
            else if (!isAddMode && selectedProduct.image) formData.append('image', selectedProduct.image);
        } else {
            formData.append(key, selectedProduct[key]);
        }
      });

      if (isAddMode) {
        const response = await productAPI.createProduct(formData);
        if (response.success) {
          await loadProducts();
          showMessage('Success', 'Product added successfully', 'success');
        }
      } else {
        const response = await productAPI.updateProduct(selectedProduct.product_id, formData);
        if (response.success) {
          await loadProducts();
          showMessage('Success', 'Product updated successfully', 'success');
        }
      }
      closeModal();
    } catch (error) {
      console.error('Error saving product:', error);
      showMessage('Error', 'Error saving product: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedProduct({ ...selectedProduct, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedProduct({ ...selectedProduct, image: file });
  };

  // --- RENDER ---
  return (
    <div className="admin-container product-page-content">
      <div className="page-header mb-4">
        <h1 className="page-title">Product Management</h1>
        <p className="page-subtitle">Manage your autoparts inventory and product details</p>
      </div>

      <div className="card">
          <div className="filter-section">
              <div className="add-product-section">
                <button className="btn btn-warning" onClick={handleAddProduct}>
                  <BsPlus className="plus-icon" /> Add Product
                </button>
              </div>

            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-dropdown">
              <option value="All Categories">All Categories</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>

            <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="filter-dropdown">
              <option value="All Brand">All Brand</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>

            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="filter-dropdown">
              <option value="All Status">All Status</option>
              {statuses.map(status => <option key={status} value={status}>{status}</option>)}
            </select>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button className="search-btn" type="button" onClick={loadProducts}>
                <BsSearch className="search-icon" />
              </button>
            </div>
        </div>
      </div>

      <div className="table-section">
        {error && (
          <div className="error-state" style={{ padding: '20px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '20px' }}>
            <strong>Error:</strong> {error}
            <button onClick={loadProducts} className="btn btn-danger" style={{ marginLeft: '10px', padding: '5px 10px', height: 'auto' }}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state"><div>Loading products...</div></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  currentProducts.map(product => (
                    <tr key={product.id}>
                      <td className="order-id-cell">{product.product_id}</td>
                      <td>
                        <div className="product-info">
                          <h4>{product.name}</h4>
                        </div>
                      </td>
                      <td><span className="category-badge">{product.category}</span></td>
                      <td>{product.brand}</td>
                      <td className="price-cell">₱{product.price?.toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${product.status?.toLowerCase()}`}>
                          {product.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => handleEditProduct(product)} className="edit-btn" title="Edit Product">
                            <BsPencil />
                          </button>
                          <button onClick={() => handleDeleteClick(product)} className="delete-btn" title="Delete Product" style={{ marginLeft: '8px', color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <BsTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer">
          <div className="results-info">
            Showing {totalItems > 0 ? displayStartIndex + 1 : 0} to {displayEndIndex} of {totalItems} Products
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      <MessageBox 
        isOpen={msgBox.isOpen}
        title={msgBox.title}
        message={msgBox.message}
        type={msgBox.type}
        onClose={closeMessage}
        onConfirm={msgBox.onConfirm}
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isAddMode ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            <form onSubmit={handleSubmitProduct} className="modal-body">
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Product Name</label>
                    <input type="text" name="name" value={selectedProduct?.name || ''} onChange={handleInputChange} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label>Brand</label>
                    <select name="brand" value={selectedProduct?.brand || ''} onChange={handleInputChange} className="form-input" required>
                      <option value="">Select Brand</option>
                      {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                </div>

                 <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={selectedProduct?.category || ''} onChange={handleInputChange} className="form-input" required>
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Price (₱)</label>
                    <input type="number" name="price" value={selectedProduct?.price || ''} onChange={handleInputChange} className="form-input" min="0" step="0.01" required />
                  </div>
                </div>
                
                <div className="form-group">
                    <label>Description</label>
                    <textarea name="description" value={selectedProduct?.description || ''} onChange={handleInputChange} className="form-textarea" rows="4" />
                </div>
                
                <div className="form-group">
                    <label>Vehicle Compatibility</label>
                    <textarea name="vehicle_compatibility" value={selectedProduct?.vehicle_compatibility || ''} onChange={handleInputChange} className="form-textarea" rows="3" />
                </div>

                 <div className="form-group">
                  <label>Requires Serial Number</label>
                  <div className="toggle-switch">
                    <input type="checkbox" id="serial-toggle" checked={selectedProduct?.requires_serial || false} onChange={(e) => setSelectedProduct({ ...selectedProduct, requires_serial: e.target.checked })} disabled={isCheckingSerials || hasUnremovableSerials} />
                    <label htmlFor="serial-toggle" className="toggle-label"><span className="toggle-slider"></span></label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div className="toggle-switch">
                    <input type="checkbox" id="status-toggle" checked={selectedProduct?.status === 'Active'} onChange={(e) => setSelectedProduct({ ...selectedProduct, status: e.target.checked ? 'Active' : 'Inactive' })} />
                    <label htmlFor="status-toggle" className="toggle-label"><span className="toggle-slider"></span></label>
                  </div>
                </div>
                
                <div className="form-group">
                    <label>Image</label>
                    <input type="file" onChange={handleFileChange} className="form-file-input" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">Cancel</button>
                <button type="submit" className="save-btn" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (isAddMode ? 'Save' : 'Update')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;