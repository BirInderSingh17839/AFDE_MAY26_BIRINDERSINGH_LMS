# LibraryOS — Library Management System (v2.1, Phase 2)

**AFDE May 2026 Capstone · Phase 2**
Participant: **Birinder Singh** · Repo: `AFDE_MAY26_BIRINDERSINGH_LMS`

A modern, full-stack Library Management System with **JWT auth**, a
**CSV/Excel ETL pipeline**, **analytics dashboards**, and **downloadable
reports** (PDF / Excel / CSV). Built on FastAPI + SQLite + React 18 +
Tailwind + Recharts.

---

## 1. Demo accounts (auto-seeded on first run)

| Role      | Email                 | Password    |
|-----------|-----------------------|-------------|
| Admin     | `admin@gmail.com`     | `85Singh85@` |
| Librarian | `librarian@gmail.com` | `85Singh85@` |
| User      | `user@gmail.com`      | `85Singh85@` |

The login page has one-click chips to fill any of them. Re-running the
backend with an existing `library.db` will **refresh** these password
hashes (so a corrupt/old hash is healed automatically).

---

## 2. Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate                 # Windows
# source .venv/bin/activate           # macOS / Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- The SQLite database `backend/library.db` is created automatically.
- Swagger UI: <http://localhost:8000/docs>.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Vite dev server: <http://localhost:5173>.
- Sign in with any demo account above.

---

## 3. What's new in v2.1 (Phase 2)

| Area               | v2.0                              | v2.1 (Phase 2)                                                             |
|--------------------|-----------------------------------|----------------------------------------------------------------------------|
| Authentication     | Signed session cookies            | **JWT bearer tokens** (PyJWT, HS256)                                       |
| Login              | Username + password               | **Email + password**, three seeded role accounts                            |
| ETL pipeline       | —                                 | **Full Extract / Transform / Load** via CSV or XLSX upload                 |
| ETL audit          | —                                 | `etl_logs` table + history page                                            |
| Analytics tables   | —                                 | `overdue_reports`, `analytics_summary`                                     |
| Reports            | CSV exports only                  | + **PDF (ReportLab)** + **multi-sheet XLSX (openpyxl)**                    |
| Overdue analysis   | Stat counters                     | Dedicated section: % overdue, avg days, est. fines, frequent late borrowers|
| Sample datasets    | 10-row seed.sql                   | 200 books / 180 borrowers / 300 transactions CSVs + a dirty demo file       |

---

## 4. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  React 18 + Vite + Tailwind + Recharts + lucide-react          │
│  AppShell (sidebar + topbar) → role-filtered pages             │
│  AuthContext   localStorage JWT ─────────► Authorization: Bearer
│  ThemeContext  dark / light                                    │
└─────────────────────────────┬──────────────────────────────────┘
                              │ Axios (no cookies needed)
┌─────────────────────────────▼──────────────────────────────────┐
│  FastAPI 0.115 · CORS · request-logging middleware             │
│  Routers:                                                      │
│    /auth         JWT login / register / me / change-password   │
│    /users        admin-only account management                 │
│    /books /borrowers /transactions /search                     │
│    /fines /notifications                                       │
│    /reports      CSV · XLSX · PDF                              │
│    /etl          upload · logs · snapshot                      │
│    /analytics    overdue · top-books · trends · active-users   │
│  Auth guards: require_admin / require_staff / require_any      │
└─────────────────────────────┬──────────────────────────────────┘
                              │ SQLAlchemy 2.0
┌─────────────────────────────▼──────────────────────────────────┐
│  SQLite (default — backend/library.db) or PostgreSQL via       │
│  DATABASE_URL.                                                 │
│  Tables: users, books, borrowers, transactions, fines,         │
│          notifications, etl_logs, overdue_reports,             │
│          analytics_summary                                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Role-based access

| Capability                                  | admin | librarian | student |
|---------------------------------------------|:-----:|:---------:|:-------:|
| Read books / search                         | ✓     | ✓         | ✓       |
| Add / edit / delete books                   | ✓     | ✓         |         |
| Manage borrowers                            | ✓     | ✓         |         |
| Issue / return books                        | ✓     | ✓         |         |
| View transactions                           | ✓     | ✓         | own only|
| Pay fines (own)                             | ✓     | ✓         | ✓       |
| Waive fines                                 | ✓     | ✓         |         |
| ETL upload + logs                           | ✓     | ✓         |         |
| Reports & exports (PDF/XLSX/CSV)            | ✓     | ✓         |         |
| Analytics endpoints                         | ✓     | ✓         |         |
| Manage users (roles, disable, delete)       | ✓     |           |         |

---

## 6. ETL pipeline

1. Navigate to **ETL Pipeline** in the sidebar (admin / librarian only).
2. Pick an entity — **books**, **borrowers**, or **transactions**.
3. Drag-and-drop or pick a CSV / XLSX file (max 10 MB).
4. Click **Run pipeline**.

The server:

* **Extracts** the file with `pandas.read_csv` / `read_excel`.
* **Normalises** column names (strip, lowercase, snake_case).
* **Validates** required columns; rejects rows with missing fields,
  bad dates, invalid emails, unknown `book_id` / `borrower_id`.
* **Deduplicates** within the file and against the DB by natural key
  (ISBN for books, email for borrowers, `(book_id, borrower_id, borrow_date)`
  for transactions).
* **Loads** the survivors in a single transaction.
* Writes one row to `etl_logs` with extracted / transformed / loaded /
  failed counts, duration, status (`ok` / `partial` / `error`), and a
  free-text summary.

### Sample datasets

The `datasets/` folder ships with deterministic CSV fixtures:

| File                       | Rows | Notes                            |
|----------------------------|------|----------------------------------|
| `books.csv`                | 200  | Clean book catalog               |
| `borrowers.csv`            | 180  | Clean members                    |
| `transactions.csv`         | 300  | ~1 year of borrow/return events  |
| `borrowers_dirty_demo.csv` | 42   | Demonstrates ETL validation/fail |

Re-generate with `python datasets/generate.py`.

### Recommended load order

Books → Borrowers → Transactions (transactions reference IDs from the
first two).

---

## 7. Configuration (`backend/.env`)

| Variable             | Default                            | Notes                                  |
|----------------------|------------------------------------|----------------------------------------|
| `DATABASE_URL`       | `sqlite:///backend/library.db`     | Postgres: `postgresql+psycopg2://…`    |
| `SESSION_SECRET`     | `dev-secret-please-change`         | JWT signing key. **Change in prod.**   |
| `JWT_EXPIRE_MINUTES` | `1440` (24h)                       | Token lifetime                          |
| `LOAN_PERIOD_DAYS`   | `14`                               | Default loan period                     |
| `FINE_PER_DAY`       | `0.50`                             | Per-day overdue fine rate               |
| `ALLOWED_ORIGINS`    | `http://localhost:5173, …:5173`    | CORS allowlist (comma-separated)        |
| `LOG_LEVEL`          | `INFO`                             | Backend log verbosity                   |

---

## 8. API surface

Interactive Swagger docs at **<http://localhost:8000/docs>**.

| Group       | Endpoints                                                                                  |
|-------------|--------------------------------------------------------------------------------------------|
| Auth        | `POST /auth/login` · `POST /auth/register` · `GET /auth/me` · `POST /auth/change-password` |
| Books       | `GET/POST /books` · `GET/PUT/DELETE /books/{id}`                                           |
| Borrowers   | `GET/POST /borrowers` · `GET/PUT/DELETE /borrowers/{id}`                                   |
| Lending     | `POST /borrow` · `POST /return` · `GET /transactions`                                      |
| Search      | `GET /search?q=…&title=…&author=…&category=…`                                              |
| Fines       | `GET /fines` · `POST /fines/pay` · `POST /fines/{id}/waive`                                |
| Notifications | `GET /notifications` · `POST /notifications/{id}/read` · `POST /notifications/read-all`  |
| **ETL**     | `POST /etl/upload` (multipart) · `GET /etl/logs` · `GET /etl/logs/{id}` · `POST /etl/snapshot` |
| **Analytics** | `GET /analytics/overdue` · `/top-books` · `/categories` · `/monthly-trends` · `/active-users` |
| **Reports** | `GET /reports/summary` · `/books.csv` · `/transactions.csv` · `/fines.csv` · `/full.xlsx` · `/overview.pdf` |
| Users       | `GET /users` · `PUT /users/{id}` · `DELETE /users/{id}` · `PUT /users/{id}/link-borrower/{bid}` |
| Dashboard   | `GET /dashboard`                                                                           |

---

## 9. Project structure

```
AFDE_MAY26_BIRINDERSINGH_LMS/
├── backend/
│   ├── main.py            # FastAPI entrypoint, JWT, CORS, request-logging middleware
│   ├── database.py        # SQLite default; SQLAlchemy 2.0 engine
│   ├── models.py          # User, Book, Borrower, Transaction, Fine, Notification,
│   │                      # EtlLog, OverdueReport, AnalyticsSummary
│   ├── schemas.py         # Pydantic request/response models incl. JWT tokens
│   ├── crud.py            # CRUD + fine calc + dashboard + report aggregations
│   ├── auth.py            # bcrypt + PyJWT + role guards + seed users
│   ├── routers/
│   │   ├── auth.py        # /auth/{login,register,me,change-password,logout}
│   │   ├── users.py       # /users (admin)
│   │   ├── books.py  borrowers.py  transactions.py  search.py
│   │   ├── fines.py  notifications.py
│   │   ├── reports.py     # CSV · XLSX · PDF
│   │   ├── etl.py         # ETL upload + logs + snapshot
│   │   └── analytics.py   # overdue / top-books / trends / active-users
│   ├── services/
│   │   └── etl.py         # Extract → Transform → Load pipeline
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx  main.jsx
│   │   ├── contexts/ AuthContext.jsx (JWT) · ThemeContext.jsx · ToastContext.jsx
│   │   ├── components/ AppShell · Sidebar · Topbar · DataTable · Modal ·
│   │   │   PageHeader · Protected · Skeleton · BookForm · BorrowerForm
│   │   ├── pages/    Login.jsx (email) · Register.jsx · Dashboard · Books ·
│   │   │   Borrowers · Transactions · Search · Fines · Notifications ·
│   │   │   Reports (overdue + downloads) · Users · Settings · Etl.jsx (NEW)
│   │   ├── services/api.js (JWT interceptor + download helper)
│   │   └── styles/global.css (Tailwind layers + design tokens)
│   ├── tailwind.config.js  postcss.config.js  vite.config.js  index.html  package.json
├── datasets/                  # Sample CSVs + generator (Phase 2)
│   ├── books.csv  borrowers.csv  transactions.csv  borrowers_dirty_demo.csv
│   ├── generate.py
│   └── README.md
├── database/
│   ├── schema.sql            # SQLite reference schema (incl. ETL tables)
│   └── seed.sql              # Optional starter data
├── docs/
│   └── API_DOCUMENTATION.md
├── requirements.txt
└── README.md
```

---

## 10. Production notes

* Change `SESSION_SECRET` to a long random string.
* Run the backend behind HTTPS; consider shortening `JWT_EXPIRE_MINUTES`
  and adding refresh tokens.
* Build the frontend with `npm run build` and serve `dist/` from any
  static host (Nginx, Vercel, Netlify, S3+CloudFront…).
* For PostgreSQL: set `DATABASE_URL` and uncomment `psycopg2-binary` in
  `requirements.txt`. No code changes needed.

---

## 11. Troubleshooting

**"Network Error" on login** — backend isn't reachable on `:8000`. Make
sure `uvicorn main:app --reload --port 8000` is running and the browser
isn't being told to use a different `VITE_API_URL`.

**bcrypt traceback on login** — `passlib==1.7.4` requires
`bcrypt<4.1`. The requirements file pins `bcrypt==4.0.1`; if you upgraded
it manually, downgrade or `pip install "bcrypt==4.0.1" --force-reinstall`.

**Old hash blocks login** — delete `backend/library.db` and restart
uvicorn. The seeded admin/librarian/user accounts will be recreated with
the canonical password.

**CORS blocked** — the backend allows any `localhost` origin by regex.
If you've changed the Vite port, set
`ALLOWED_ORIGINS=http://localhost:<port>` in `.env` and restart.

---

## 12. Credits

Icons from [Lucide](https://lucide.dev), charts from
[Recharts](https://recharts.org), PDFs from [ReportLab](https://www.reportlab.com),
spreadsheets via [openpyxl](https://openpyxl.readthedocs.io/),
data ETL with [pandas](https://pandas.pydata.org/).
