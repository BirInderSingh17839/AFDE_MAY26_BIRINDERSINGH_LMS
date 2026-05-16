# 📚 Library Management System (LMS)

**Phase 1 Capstone Project — AFDE May 2026**
Participant: **Birinder Singh**
Repository code: `AFDE_MAY26_BIRINDERSINGH_LMS`

A full-stack web application that digitizes traditional library operations — book catalog management, borrower records, borrow/return workflows, and book search — built with **React**, **FastAPI**, and **PostgreSQL**.

---

## 1. Project Overview

Libraries often manage books and borrower records manually using notebooks or spreadsheets. This creates issues around tracking, search, history, and overall visibility. This project provides a clean web-based platform that centralizes these operations.

**Phase 1 scope:**
- Book management (CRUD)
- Borrower management (CRUD)
- Borrow / return workflow with availability tracking
- Search by keyword, title, author, or category
- Dashboard with live statistics
- REST API + responsive React UI

**Out of scope for Phase 1:** authentication, fines, notifications, AI/semantic search, deployment.

---

## 2. Features Implemented

- 📊 **Dashboard** — total books, available, borrowed, borrowers, transactions, recent activity
- 📚 **Book Management** — add / edit / delete / list with inline filter
- 👥 **Borrower Management** — add / edit / delete / list with validation
- 🔄 **Borrow & Return** — record lending and returns, auto-update availability
- 🔍 **Search** — keyword search + filter by title / author / category
- ✅ Form validation, error toasts, modal dialogs
- 🎨 Modern indigo/violet themed responsive UI

---

## 3. Technology Stack

| Layer        | Technology                |
|--------------|---------------------------|
| Frontend     | React 18 + Vite + React Router + Axios |
| Backend      | FastAPI + Pydantic + SQLAlchemy ORM |
| Database     | PostgreSQL (SQLite supported as fallback) |
| API testing  | Postman / Swagger UI (built into FastAPI) |
| Version ctrl | Git / GitHub              |

---

## 4. Project Structure

```
AFDE_MAY26_BIRINDERSINGH_LMS/
├── backend/
│   ├── main.py            # FastAPI entrypoint
│   ├── database.py        # SQLAlchemy engine & session
│   ├── models.py          # ORM models (Book, Borrower, Transaction)
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── crud.py            # Database access logic
│   ├── routers/
│   │   ├── books.py
│   │   ├── borrowers.py
│   │   ├── transactions.py
│   │   └── search.py
│   ├── services/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/    # Sidebar, Modal, Toast, BookForm, BorrowerForm
│   │   ├── pages/         # Dashboard, Books, Borrowers, Transactions, Search
│   │   ├── services/api.js
│   │   ├── styles/global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── database/
│   ├── schema.sql         # PostgreSQL schema
│   └── seed.sql           # Sample data
├── docs/
│   └── API_DOCUMENTATION.md
├── screenshots/           # Add your UI/API screenshots here
├── README.md
├── requirements.txt
└── .gitignore
```

---

## 5. Setup Instructions

### 5.1 Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL 13+ (or use SQLite — see the note at the bottom of section 5.2)

### 5.2 Backend Setup

```bash
cd backend

# 1) Create + activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# 2) Install dependencies
pip install -r requirements.txt

# 3) Configure the database URL
# Copy .env.example to .env and edit it, OR export the variable:
# Windows (PowerShell):
$env:DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/library_db"
# macOS / Linux:
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/library_db"

# 4) Create the database (one-time)
createdb library_db
psql -d library_db -f ../database/schema.sql
psql -d library_db -f ../database/seed.sql   # optional sample data

# 5) Run the API
uvicorn main:app --reload --port 8000
```

The API will be live at <http://localhost:8000> and the interactive Swagger UI at <http://localhost:8000/docs>.

> **Don't have PostgreSQL?** Use SQLite — just set
> `DATABASE_URL="sqlite:///./library.db"` instead. Tables are auto-created on startup, no `schema.sql` step needed.

### 5.3 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The React app opens at <http://localhost:5173>. It calls the backend at <http://localhost:8000> by default (override with `VITE_API_URL` in `.env`).

---

## 6. API Endpoints

### Books

| Method | Endpoint        | Description       |
|--------|-----------------|-------------------|
| GET    | `/books`        | List all books    |
| GET    | `/books/{id}`   | Get book by id    |
| POST   | `/books`        | Add a new book    |
| PUT    | `/books/{id}`   | Update a book     |
| DELETE | `/books/{id}`   | Delete a book     |

### Borrowers

| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/borrowers`       | List all borrowers  |
| GET    | `/borrowers/{id}`  | Get borrower by id  |
| POST   | `/borrowers`       | Add a borrower      |
| PUT    | `/borrowers/{id}`  | Update borrower     |
| DELETE | `/borrowers/{id}`  | Delete borrower     |

### Transactions

| Method | Endpoint         | Description                |
|--------|------------------|----------------------------|
| POST   | `/borrow`        | Borrow a book              |
| POST   | `/return`        | Return a book              |
| GET    | `/transactions`  | List all transactions      |

### Search & Dashboard

| Method | Endpoint     | Description                       |
|--------|--------------|-----------------------------------|
| GET    | `/search`    | Search books (`q`, `title`, `author`, `category`) |
| GET    | `/dashboard` | Aggregate statistics              |

Full request/response examples are in [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

---

## 7. Database Schema (summary)

**books**`(book_id, title, author, category, isbn, availability_status)`
**borrowers**`(borrower_id, borrower_name, email, phone)`
**transactions**`(transaction_id, book_id → books, borrower_id → borrowers, borrow_date, return_date)`

See [`database/schema.sql`](database/schema.sql) for the full DDL.

---

## 8. Screenshots

Place your screenshots in `screenshots/` and reference them here:

- `screenshots/dashboard.png`
- `screenshots/books-page.png`
- `screenshots/borrow-return.png`
- `screenshots/search.png`
- `screenshots/swagger-ui.png`

---

## 9. Future Enhancements

- 🔐 Authentication & role-based access (admin vs. borrower)
- 💸 Fine / overdue calculation
- 📧 Email reminders for due returns
- 🤖 Semantic / AI-powered book recommendations
- ☁️  Cloud deployment (Render, Railway, AWS)

---

## 10. Author

**Birinder Singh** — Prodapt AFDE May 2026 Batch
Project Code: `LMS` · Repo: `AFDE_MAY26_BIRINDERSINGH_LMS`
