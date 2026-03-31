# Rabanq Backend API

A comprehensive fintech backend API built with Node.js, Express, and MongoDB, featuring user authentication, KYC verification, transaction management, account handling, activity tracking, file uploads, and administrative controls.

## 🚀 Features

- **User Authentication & Authorization**: JWT-based authentication with secure session management
- **KYC Verification**: Comprehensive Know Your Customer process with document uploads
- **Transaction Management**: Secure financial transaction processing and tracking
- **Account Management**: Multi-account support with balance tracking
- **Activity Logging**: Detailed activity tracking for audit and compliance
- **File Upload**: AWS S3 integration for secure document storage
- **Admin Panel**: Administrative controls and user management
- **Security**: Helmet, rate limiting, CORS, input sanitization, and XSS protection
- **Logging**: Winston-based logging with Morgan HTTP request logging
- **Email Notifications**: Nodemailer integration for user communications
- **Two-Factor Authentication**: OTP support with QR code generation

## 🛠 Tech Stack

- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **File Storage**: AWS S3
- **Security**: Helmet, CORS, Rate Limiting, MongoDB Sanitization, XSS Clean
- **Validation**: Express Validator
- **Logging**: Winston, Morgan
- **Email**: Nodemailer
- **Testing**: Jest, Supertest
- **Linting**: ESLint
- **Process Management**: Nodemon for development

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- AWS S3 bucket (for file uploads)
- SMTP server (for email notifications)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rabanq-backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```env
   NODE_ENV=development
   PORT=5000

   # Database
   MONGODB_URI=mongodb://localhost:27017/rabanq

   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   JWT_COOKIE_EXPIRE=7

   # AWS S3
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=your-aws-region
   S3_BUCKET_NAME=your-s3-bucket-name

   # Email
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-email-password

   # Client
   CLIENT_URL=http://localhost:3000

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100

   # Other
   BCRYPT_ROUNDS=12
   ```

## 🚀 Running the Application

### Development Mode
```bash
pnpm run dev
```

### Production Mode
```bash
pnpm start
```

The server will start on the port specified in your `.env` file (default: 5000).

## 📚 API Documentation

The API is organized into the following modules:

### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users (`/api/users`)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `POST /api/users/verify-email` - Verify email address

### KYC (`/api/kyc`)
- `POST /api/kyc/submit` - Submit KYC documents
- `GET /api/kyc/status` - Get KYC verification status
- `PUT /api/kyc/update` - Update KYC information

### Transactions (`/api/transactions`)
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions` - Get user transactions
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update transaction status

### Accounts (`/api/accounts`)
- `POST /api/accounts` - Create new account
- `GET /api/accounts` - Get user accounts
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account information

### Activity (`/api/activity`)
- `GET /api/activity` - Get user activity logs
- `GET /api/activity/:id` - Get specific activity details

### Upload (`/api/upload`)
- `POST /api/upload` - Upload files to S3
- `DELETE /api/upload/:key` - Delete uploaded file

### Admin (`/api/admin`)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/transactions` - Get all transactions
- `PUT /api/admin/user/:id` - Update user status
- `DELETE /api/admin/user/:id` - Delete user

## 🧪 Testing

Run the test suite with coverage:
```bash
pnpm test
```

## 📝 Scripts

- `pnpm start` - Start the production server
- `pnpm run dev` - Start the development server with hot reload
- `pnpm test` - Run tests with Jest
- `pnpm run lint` - Lint the codebase with ESLint

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Sanitization**: MongoDB injection and XSS protection
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for secure password storage
- **File Upload Security**: Multer with file type validation

## 📁 Project Structure

```
src/
├── app.js                 # Express app configuration
├── server.js              # Server entry point
├── config/                # Configuration files
│   ├── database.js        # MongoDB connection
│   ├── email.js           # Email configuration
│   ├── logger.js          # Winston logger setup
│   └── s3.js              # AWS S3 configuration
├── controllers/           # Route controllers
├── middleware/            # Custom middleware
├── models/                # MongoDB models
├── routes/                # API routes
├── utils/                 # Utility functions
└── validators/            # Input validation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@rabanq.com or create an issue in this repository.
