import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchInventory = async () => {
    try {
      const response = await apiClient.get('/inventory');
      setItems(response.data);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await apiClient.delete(`/inventory/${id}`);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const filteredItems = items.filter(item =>
    item.product_name.toLowerCase().includes(filter.toLowerCase()) ||
    item.sku.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1>Inventory List</h1>
        {user?.role === 'creator' && (
          <button onClick={() => navigate('/inventory/add')} className="add-btn">Add Item</button>
        )}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <table className="inventory-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>SKU</th>
            <th>Quantity</th>
            <th>Purchase Cost</th>
            <th>Last Updated</th>
            {user?.role === 'creator' && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(item => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td>{item.sku}</td>
              <td>{item.quantity}</td>
              <td>${item.purchase_cost}</td>
              <td>{new Date(item.last_updated_at).toLocaleString()}</td>
              {user?.role === 'creator' && (
                <td>
                  <button onClick={() => navigate(`/inventory/edit/${item.id}`)} className="edit-btn">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="delete-btn">Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {filteredItems.length === 0 && <p className="no-data">No inventory items found.</p>}
    </div>
  );
};

export default Inventory;
