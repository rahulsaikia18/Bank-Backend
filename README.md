# Banking System Backend

A Node.js backend for a simple banking system, supporting user authentication, account management, transactions, and ledger tracking. Built with Express and MongoDB.

## Features
- User registration & authentication
- Account creation & management
- Transaction processing (deposits, withdrawals, transfers)
- Ledger tracking for all accounts
- Email notifications for key actions

## Project Structure
```
├── package.json
├── server.js
└── src/
    ├── app.js
    ├── config/
    │   └── db.js
    ├── controller/
    │   ├── account.controller.js
    │   ├── auth.controller.js
    │   └── transection.controller.js
    ├── middleware/
    │   └── auth.middlware.js
    ├── models/
    │   ├── account.model.js
    │   ├── ledger.model.js
    │   ├── transaction.model.js
    │   └── user.model.js
    ├── routes/
    │   ├── accounts.routes.js
    │   ├── auth.routes.js
    │   └── transection.routes.js
    └── services/
        └── email.service.js
```

## Getting Started

### Prerequisites
- Node.js (v14+ recommended)
- MongoDB

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Banking system
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file in the root directory.
   - Add your MongoDB URI and other secrets:
     ```env
     MONGODB_URI=your_mongodb_uri
     JWT_SECRET=your_jwt_secret
     EMAIL_USER=your_email
     EMAIL_PASS=your_email_password
     ```

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
