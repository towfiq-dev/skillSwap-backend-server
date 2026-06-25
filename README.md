<div align="center">

# ⚙️ SkillSwap — Backend Server

### RESTful API Server for the SkillSwap Freelancing Platform

[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payment_API-635BFF?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

</div>

---

## 📌 Project Overview

**SkillSwap Backend** is the complete server-side application powering the SkillSwap freelancing marketplace. It is a **RESTful API** server built with **Express.js** that handles all data operations related to tasks, proposals, payments, users, and admin management. The server connects to **MongoDB Atlas** as its database and integrates **Stripe** for secure payment processing.

---

## 🎯 Purpose

- Process all API requests coming from the frontend
- Verify JWT tokens and enforce secure authentication
- Store, update, and delete data in MongoDB
- Create and confirm Stripe payment sessions
- Implement role-based access control (client, freelancer, admin)

---

## 🛠️ Tech Stack

| Package | Version | Usage |
|---|---|---|
| **Express.js** | 5.2.1 | Node.js web framework |
| **MongoDB Driver** | 7.3.0 | MongoDB database connection |
| **Stripe** | 22.2.1 | Payment gateway |
| **jose-cjs** | 6.2.3 | JWT token verification via JWKS |
| **dotenv** | 17.x | Environment variable management |
| **cors** | 2.8.6 | Cross-Origin Resource Sharing |

---

## 🗄️ Database Collections

The following 4 MongoDB collections are used:

| Collection | Description |
|---|---|
| `tasks` | All tasks posted by clients |
| `proposals` | Freelancer proposals submitted for tasks |
| `payments` | Records of completed payments |
| `user` | All registered users |

---

## 📡 API Endpoints

### 🏠 General
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/` | Server status check | Public |

---

### 📋 Tasks
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/tasks` | Get all tasks (filterable by userId) | Public |
| `GET` | `/tasks/:id` | Get a specific task's details | Public |
| `GET` | `/featured-tasks` | Latest 6 open tasks for the homepage | Public |
| `GET` | `/browse-tasks` | Browse tasks with filters and search | Public |
| `POST` | `/tasks` | Create a new task | Auth Required |
| `PATCH` | `/tasks/:id` | Update a task | Auth Required |
| `DELETE` | `/tasks/:id` | Delete a task | Auth Required |
| `PATCH` | `/tasks/mark-paid/:taskId` | Mark a task as "paid" | Public |
| `PATCH` | `/tasks/submit-deliverable/:id` | Submit a deliverable for a task | Public |

---

### 📝 Proposals
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/proposals` | Submit a new proposal | Auth Required |
| `GET` | `/proposals/:taskId` | Get all proposals for a task | Auth Required |
| `GET` | `/proposals/freelancer/:email` | Get all proposals by a freelancer | Public |
| `PATCH` | `/proposals/accept/:id` | Accept a proposal | Public |
| `PATCH` | `/proposals/reject/:id` | Reject a proposal | Public |

---

### 💳 Payments
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/create-checkout-session` | Create a Stripe Checkout session | Public |
| `POST` | `/confirm-session` | Confirm and save a payment session | Public |
| `GET` | `/payments` | Get all payment history | Public |
| `GET` | `/payments/freelancer/:email` | Get payments for a specific freelancer | Public |

---

### 👤 Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/users/ensure` | Ensure a user exists or create one | Public |
| `GET` | `/users/me` | Get the currently logged-in user | Auth Required |
| `GET` | `/users/profile/:email` | Get a user profile by email | Public |
| `PATCH` | `/users/profile/:email` | Update a user profile | Public |
| `GET` | `/users/status/:email` | Check if a user is blocked | Public |

---

### 👨‍💻 Freelancers
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/freelancers` | Get all freelancers | Public |
| `GET` | `/freelancers/:id` | Get a freelancer's profile by ID | Public |
| `GET` | `/top-freelancers` | Top freelancers for homepage | Public |
| `GET` | `/freelancer/stats/:email` | Get freelancer statistics | Auth Required |
| `GET` | `/freelancer/active-projects/:email` | Get active projects for a freelancer | Public |
| `PATCH` | `/freelancer/profile/:email` | Update freelancer profile | Public |

---

### 📊 Client Stats
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/client/stats/:email` | Get client task and spending statistics | Auth Required |

---

### 🛡️ Admin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/admin/users` | Get all users | Admin Only |
| `PATCH` | `/admin/users/block/:id` | Block a user | Admin Only |
| `PATCH` | `/admin/users/unblock/:id` | Unblock a user | Admin Only |
| `GET` | `/admin/tasks` | Get all tasks | Admin Only |
| `DELETE` | `/admin/tasks/:id` | Delete any task | Admin Only |
| `GET` | `/admin/payments` | Get all payment history | Admin Only |

---

## 🔒 Authentication & Security

### JWT Verification
The server uses **Better Auth**'s JWKS (JSON Web Key Set) to verify tokens:

```javascript
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)
```

### `requireAuth` Middleware
- Checks for `Authorization: Bearer <token>` header
- Verifies the token against JWKS
- Looks up user data from the database
- Denies access to blocked users

### `requireAdmin` Middleware
- Only grants access to users with `role: "admin"`
- Returns `403 Forbidden` for all other roles

---

## 💳 Stripe Payment Integration

**Workflow:**

```
1. Client clicks the "Pay" button
       ↓
2. Frontend → POST /create-checkout-session
       ↓
3. Stripe Checkout session is created
       ↓
4. Client is redirected to the Stripe payment page
       ↓
5. On success → redirected to /payment/success
       ↓
6. POST /confirm-session → payment saved to DB
       ↓
7. Task and proposal statuses are updated
```

---

## 📁 Project Structure

```
skillSwap-backend-server/
├── index.js          # Main server file (all routes defined here)
├── package.json      # Dependencies and scripts
├── vercel.json       # Vercel deployment configuration
├── .env              # Environment variables
└── .gitignore        # Git ignore file
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js (v18 or above)
- npm
- MongoDB Atlas account
- Stripe account (test keys)

### Steps

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd skillSwap-backend-server
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create a `.env` file and add the following:

```env
MONGO_DB_URI=your_mongodb_atlas_connection_string
DB_Name=your_database_name
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
CLIENT_URL=http://localhost:3000
```

**4. Start the server**
```bash
# Production
npm start

# Development (with nodemon)
npx nodemon index.js
```

Server will run at: `http://localhost:5000`

---

## 🌐 Deployment (Vercel)

This server is configured to deploy as **Vercel Serverless Functions**.

**`vercel.json` configuration:**
```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

**Deploy:**
```bash
npm i -g vercel
vercel
```

Remember to set all environment variables in the Vercel dashboard before deploying.

---

## 📊 API Response Format

### Success Response
```json
{
  "_id": "...",
  "title": "Task Title",
  "status": "open",
  "createdAt": "2026-06-25T..."
}
```

### Error Response
```json
{
  "message": "Unauthorized"
}
```

### HTTP Status Codes
| Code | Meaning |
|---|---|
| `200` | Successful request |
| `201` | Resource created successfully |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (no access / blocked user) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## 🤝 Contributing

1. **Fork** this repository
2. Create a new branch: `git checkout -b feature/new-endpoint`
3. Commit your changes: `git commit -m 'Add new endpoint'`
4. Push to the branch: `git push origin feature/new-endpoint`
5. Open a **Pull Request**

---

<div align="center">

**SkillSwap Backend** — Powering the SkillSwap Freelancing Ecosystem ⚡

*Built with Node.js, Express & MongoDB*

</div>
