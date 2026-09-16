import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchPayments = async () => {
    try {
      const response = await apiClient.get('/payments');
      setPayments(response.data);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await apiClient.delete(`/payments/${id}`);
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete record');
    }
  };

  const filteredPayments = payments.filter(p =>
    p.customer_name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1>Payments Tracking</h1>
        {(user?.role === 'creator' || user?.role === 'sales') && (
          <button onClick={() => navigate('/payments/add')} className="add-btn">Add Payment</button>
        )}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by customer name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <table className="inventory-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Amount Received</th>
            <th>Date</th>
            <th>Medium</th>
            <th>Pending</th>
            <th>Exp. Pending Date</th>
            {user?.role === 'creator' && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredPayments.map(p => (
            <tr key={p.id}>
              <td>{p.customer_name}</td>
              <td>${p.amount_received}</td>
              <td>{new Date(p.payment_date).toLocaleDateString()}</td>
              <td className="medium-badge">{p.payment_medium}</td>
              <td className="pending-text">${p.amount_pending}</td>
              <td>{p.expected_pending_date ? new Date(p.expected_pending_date).toLocaleDateString() : '-'}</td>
              {user?.role === 'creator' && (
                <td>
                  <button onClick={() => navigate(`/payments/edit/${p.id}`)} className="edit-btn">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="delete-btn">Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {filteredPayments.length === 0 && <p className="no-data">No payment records found.</p>}
    </div>
  );
};

export default Payments;
