const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Serial Number API functions
export const serialNumberAPI = {
  // Get available serial numbers for a product
  getAvailableSerials: async (productId) => {
    const response = await fetch(`${API_BASE_URL}/serial-numbers/product/${productId}/available`, {
      credentials: 'include'
    });
    return handleResponse(response);
  },

  // Get all serial numbers for a product
  getAllSerials: async (productId) => {
    const response = await fetch(`${API_BASE_URL}/serial-numbers/product/${productId}`, {
      credentials: 'include'
    });
    return handleResponse(response);
  },

  // Get serial numbers by sale ID
  getBySaleId: async (saleId) => {
    const response = await fetch(`${API_BASE_URL}/serial-numbers/sale/${saleId}`, {
      credentials: 'include'
    });
    return handleResponse(response);
  },

  // Create serial numbers
  createSerials: async (serialNumbers) => {
    const response = await fetch(`${API_BASE_URL}/serial-numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ serialNumbers }),
      credentials: 'include'
    });
    return handleResponse(response);
  },

  // Mark serial numbers as sold
  markAsSold: async (serialNumbers, saleId, saleItemId = null) => {
    const response = await fetch(`${API_BASE_URL}/serial-numbers/mark-sold`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ serialNumbers, saleId, saleItemId }),
      credentials: 'include'
    });
    return handleResponse(response);
  },

  // Mark serial numbers as defective
  markAsDefective: async (serialNumbers, notes = null) => {
    const response = await fetch(`${API_BASE_URL}/serial-numbers/defective`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ serialNumbers, notes }),
      credentials: 'include'
    });
    return handleResponse(response);
  },

  // Delete serial numbers
  deleteSerials: async (serialNumbers) => {
    const response = await fetch(`${API_BASE_URL}/serial-numbers`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ serialNumbers }),
      credentials: 'include'
    });
    return handleResponse(response);
  }
};
