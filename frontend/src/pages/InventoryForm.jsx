import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/client';

const InventoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    product_name: '',
    sku: '',
    quantity: 0,
    purchase_cost: 0,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchItem = async () => {
        try {
          const response = await apiClient.get(`/inventory/${id}`);
          setFormData(response.data);
        } catch (err) {
          alert('Error fetching item details');
          navigate('/inventory');
        }
      };
      fetchItem();
    }
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (id) {
        await apiClient.put(`/inventory/${id}`, formData);
      } else {
        await apiClient.post('/inventory', formData);
      }
      navigate('/inventory');
    } catch (err) {
      if (err.response?.data?.errors) {
        const validationErrors = {};
        err.response.data.errors.forEach(e => {
          validationErrors[e.path[0]] = e.msg;
        });
        setErrors(validationErrors);
      } else {
        alert(err.response?.data?.error || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <h2>{id ? 'Edit' : 'Add'} Inventory Item</h2>
      <form onSubmit={handleSubmit} className="inventory-form">
        <div className="form-group">
          <label>Product Name</label>
          <input
            type="text"
            value={formData.product_name}
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            required
          />
          {errors.product_name && <span className="error">{errors.product_name}</span>}
        </div>
        <div className="form-group">
          <label>SKU</label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            required
          />
          {errors.sku && <span className="error">{errors.sku}</span>}
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            required
          />
          {errors.quantity && <span className="error">{errors.quantity}</span>}
        </div>
        <div className="form-group">
          <label>Purchase Cost</label>
          <input
            type="number"
            step="0.01"
            value={formData.purchase_cost}
            onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
            required
          />
          {errors.purchase_cost && <span className="error">{errors.purchase_cost}</span>}
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/inventory')}>Cancel</button>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (id ? 'Update Item' : 'Create Item')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;
