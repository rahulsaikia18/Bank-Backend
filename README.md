# Banking System Backend

A Node.js backend for a simple banking system, supporting user authentication, account management, transactions, and ledger tracking. Built with Express and MongoDB.

🏦 Bank-Backend

A secure, production-style banking backend built with Node.js, Express, MongoDB, and JWT, implementing real-world concepts like accounts, ledger-based balance calculation, idempotent transactions, authentication, authorization, and email notifications.

This project follows clean architecture and banking-grade transaction principles (ledger system, atomic transactions, immutability).

---

## 🚀 Features

🔐 JWT Authentication (Login / Register / Logout)

👤 User & System User roles

🏦 Multiple bank accounts per user

📒 Ledger-based accounting system

💰 Atomic money transfers using MongoDB transactions

🔁 Idempotent transactions (safe retries)

📊 Real-time balance calculation

❌ Token blacklisting on logout

📧 Email notifications using Nodemailer (OAuth2)

🛡️ Protected & role-based routes

⏳ Auto-expiring blacklisted tokens

---

## 🗂️ Project Structure
```
Bank-Backend
├── package.json
├── server.js
├── .env
└── src
    ├── app.js
    ├── config
    │   └── db.js
    ├── controller
    │   ├── account.controller.js
    │   ├── auth.controller.js
    │   └── transection.controller.js
    ├── middleware
    │   └── auth.middlware.js
    ├── models
    │   ├── user.model.js
    │   ├── account.model.js
    │   ├── ledger.model.js
    │   ├── transaction.model.js
    │   └── blacklist.model.js
    ├── routes
    │   ├── auth.routes.js
    │   ├── accounts.routes.js
    │   └── transection.routes.js
    └── services
        └── email.service.js
```

---

## 🧠 Core Concepts Used

### 1️⃣ Ledger System (Banking Style)
- Balance is never stored
- Balance = Total Credits − Total Debits
- Ledger entries are immutable

### 2️⃣ Atomic Transactions
- Uses MongoDB sessions
- Debit + Credit happen in a single transaction
- Prevents partial updates

### 3️⃣ Idempotency
- Each transaction requires a unique idempotencyKey
- Prevents duplicate transfers on retries

### 4️⃣ Security
- JWT authentication
- Token blacklisting on logout
- Role-based access for system operations

---

## 🔑 Environment Variables

Create a .env file in the root directory:

```env
# DATABASE CONFIG
MONGO_URI=

# JWT CONFIG
JWT_SECRET=

# NODEMAILER CONFIG (Gmail OAuth2)
CLIENT_ID=
CLIENT_SECRET=
REFRESH_TOKEN=
EMAIL_USER=
```

---

## 📦 Installation & Setup

```bash
# Clone repository


# Move into directory
cd Bank-Backend

# Install dependencies
npm install

# Start server
node server.js
```

Server will run on:

http://localhost:3000

---

## 🔌 API Endpoints

### 🔐 Auth Routes
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

### 🏦 Account Routes (Protected)
POST   /api/accounts
GET    /api/accounts
GET    /api/accounts/balance/:accountId

### 💸 Transaction Routes (Protected)
POST   /api/transection
POST   /api/transection/system/initial-funds

---

## 📧 Email Notifications
- Welcome email on registration
- Transaction success email
- Transaction failure email
- Implemented using Nodemailer + Gmail OAuth2

---

## ⚠️ Important Notes
- Ledger entries cannot be updated or deleted
- Transactions are fully ACID compliant
- Token blacklist entries auto-delete after 3 days
- Designed to mimic real banking systems

---

## 🛠️ Tech Stack
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT
- Nodemailer
- bcrypt
- Cookie-parser

---

## 📌 Future Improvements
- Transaction reversal system
- Rate limiting
- Admin dashboard
- Audit logs
- Swagger API documentation

---

## 👨‍💻 Author

Rahul Saikia  
Full Stack Developer | MERN
### Running the Server
```bash
nodemon server.js
```
Or
```bash
node server.js
```

## API Endpoints
- `/api/auth` - Authentication routes
- `/api/accounts` - Account management routes
- `/api/transactions` - Transaction routes

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
MIT
