import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="unauthorized-page">
      <h1>403 - Unauthorized</h1>
      <p>You do not have the required permissions to access this page.</p>
      <Link to="/dashboard">Go back to Dashboard</Link>
    </div>
  );
};

export default Unauthorized;
