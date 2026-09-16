# Inventory Management App

A full-stack application for tracking inventory and payments, featuring a robust backend API and a responsive React frontend.

## 🚀 Features

- **Authentication**: Secure user login and protected routes.
- **Inventory Management**: Full CRUD operations for inventory items.
- **Payment Tracking**: Manage and track payments associated with inventory.
- **Data Import/Export**: Scripts to handle Excel file imports and sample data generation.
- **Role-Based Access**: Unauthorized access prevention for protected pages.

## 🛠️ Tech Stack

- **Frontend**: React, CSS3
- **Backend**: Node.js, Express
- **Database**: SQL (Refer to `backend/scripts/schema.sql`)
- **Authentication**: JWT-based authentication

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- A SQL Database (PostgreSQL/MySQL)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env` and fill in your database credentials and secret key.
4. Initialize the database:
   - Run the SQL script in `backend/scripts/schema.sql` in your database manager.
   - Use `node scripts/seedAdmin.js` to create an initial administrator account.
5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

## 📂 Project Structure

- `backend/`: Server-side logic, API routes, and database scripts.
- `frontend/`: Client-side React application.
- `backend/scripts/`: Utility scripts for database initialization and data import.

## 📝 License

This project is licensed under the MIT License.
