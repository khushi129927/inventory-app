import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/client';

const PaymentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer_name: '',
    amount_received: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_medium: 'bank',
    amount_pending: 0,
    expected_pending_date: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchPayment = async () => {
        try {
          const response = await apiClient.get(`/payments/${id}`);
          const data = response.data;
          setFormData({
            ...data,
            payment_date: data.payment_date.split('T')[0],
            expected_pending_date: data.expected_pending_date ? data.expected_pending_date.split('T')[0] : '',
          });
        } catch (err) {
          alert('Error fetching payment details');
          navigate('/payments');
        }
      };
      fetchPayment();
    }
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (id) {
        await apiClient.put(`/payments/${id}`, formData);
      } else {
        await apiClient.post('/payments', formData);
      }
      navigate('/payments');
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
      <h2>{id ? 'Edit' : 'Add'} Payment Record</h2>
      <form onSubmit={handleSubmit} className="inventory-form">
        <div className="form-group">
          <label>Customer Name</label>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            required
          />
          {errors.customer_name && <span className="error">{errors.customer_name}</span>}
        </div>
        <div className="form-group">
          <label>Amount Received</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount_received}
            onChange={(e) => setFormData({ ...formData, amount_received: parseFloat(e.target.value) || 0 })}
            required
          />
          {errors.amount_received && <span className="error">{errors.amount_received}</span>}
        </div>
        <div className="form-group">
          <label>Payment Date</label>
          <input
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            required
          />
          {errors.payment_date && <span className="error">{errors.payment_date}</span>}
        </div>
        <div className="form-group">
          <label>Payment Medium</label>
          <select
            value={formData.payment_medium}
            onChange={(e) => setFormData({ ...formData, payment_medium: e.target.value })}
            required
          >
            <option value="bank">Bank</option>
            <option value="UPI">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
          </select>
          {errors.payment_medium && <span className="error">{errors.payment_medium}</span>}
        </div>
        <div className="form-group">
          <label>Amount Pending</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount_pending}
            onChange={(e) => setFormData({ ...formData, amount_pending: parseFloat(e.target.value) || 0 })}
            required
          />
          {errors.amount_pending && <span className="error">{errors.amount_pending}</span>}
        </div>
        <div className="form-group">
          <label>Expected Pending Date (Optional)</label>
          <input
            type="date"
            value={formData.expected_pending_date}
            onChange={(e) => setFormData({ ...formData, expected_pending_date: e.target.value })}
          />
          {errors.expected_pending_date && <span className="error">{errors.expected_pending_date}</span>}
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/payments')}>Cancel</button>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (id ? 'Update Payment' : 'Save Payment')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
