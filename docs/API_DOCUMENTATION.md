# API Documentation — LibraryOS v2

Base URL: `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs` (Swagger UI) and `/redoc`.

All requests/responses use `application/json` except CSV exports.

> **Authentication.** Most endpoints require an active session. Call
> `POST /auth/login` first; the server sets a signed cookie
> (`lms_session`) which the browser sends back automatically when the
> Axios client is configured with `withCredentials: true`.

---

## Health

| Method | Path        | Auth | Description                       |
|--------|-------------|------|-----------------------------------|
| GET    | `/`         | none | Root status + version             |
| GET    | `/health`   | none | Lightweight DB ping               |

---

## Authentication

| Method | Path                       | Auth   | Body                                                  | Description                                              |
|--------|----------------------------|--------|-------------------------------------------------------|----------------------------------------------------------|
| POST   | `/auth/register`           | public | `{ username, email, full_name, password, role? }`     | Create account. **The very first user is forced to `admin`.** Subsequent users default to `student`. |
| POST   | `/auth/login`              | public | `{ username, password }`                              | Logs in and sets the session cookie. Returns the user.   |
| POST   | `/auth/logout`             | any    | —                                                     | Clears the session cookie.                               |
| GET    | `/auth/me`                 | any    | —                                                     | Returns the current user.                                |
| POST   | `/auth/change-password`    | any    | `{ old_password, new_password }`                      | Verifies the old password before updating.               |

---

## Users (admin only)

| Method | Path                                       | Body              | Description                          |
|--------|--------------------------------------------|-------------------|--------------------------------------|
| GET    | `/users/`                                  | —                 | List all users.                      |
| PUT    | `/users/{user_id}`                         | partial user      | Update role, full_name, email, active|
| DELETE | `/users/{user_id}`                         | —                 | Delete user (cannot delete self).    |
| PUT    | `/users/{user_id}/link-borrower/{borrower_id}` | —             | Link a student account to a member.  |

---

## Books

| Method | Path                  | Auth                | Body                                                              |
|--------|-----------------------|---------------------|-------------------------------------------------------------------|
| GET    | `/books/`             | any                 | —                                                                 |
| GET    | `/books/{book_id}`    | any                 | —                                                                 |
| POST   | `/books/`             | admin / librarian   | `{ title, author, category, isbn, availability_status? }`        |
| PUT    | `/books/{book_id}`    | admin / librarian   | partial book                                                      |
| DELETE | `/books/{book_id}`    | admin / librarian   | —                                                                 |

---

## Borrowers

| Method | Path                          | Auth                | Body                                |
|--------|-------------------------------|---------------------|-------------------------------------|
| GET    | `/borrowers/`                 | any                 | —                                   |
| GET    | `/borrowers/{borrower_id}`    | any                 | —                                   |
| POST   | `/borrowers/`                 | admin / librarian   | `{ borrower_name, email, phone }`  |
| PUT    | `/borrowers/{borrower_id}`    | admin / librarian   | partial borrower                    |
| DELETE | `/borrowers/{borrower_id}`    | admin / librarian   | —                                   |

---

## Transactions (borrow / return / list)

| Method | Path             | Auth                | Body                                                 |
|--------|------------------|---------------------|------------------------------------------------------|
| POST   | `/borrow`        | admin / librarian   | `{ book_id, borrower_id, loan_days? }`              |
| POST   | `/return`        | admin / librarian   | `{ transaction_id }` — auto-creates a Fine if late  |
| GET    | `/transactions`  | any (students see only their own) | query `?borrower_id=&skip=&limit=` |

The Transaction response includes a computed `is_overdue` flag.

---

## Search

| Method | Path     | Auth | Query                                          |
|--------|----------|------|------------------------------------------------|
| GET    | `/search`| any  | `q`, `title`, `author`, `category` (all optional, combined with AND) |

---

## Fines

| Method | Path                       | Auth                                      | Body / Query                |
|--------|----------------------------|-------------------------------------------|-----------------------------|
| GET    | `/fines/`                  | any (students see own only)               | `?status=unpaid|paid|waived&borrower_id=` |
| POST   | `/fines/pay`               | any (students can pay their own)          | `{ fine_id }`               |
| POST   | `/fines/{fine_id}/waive`   | admin / librarian                         | —                           |

Fine math (configurable in `.env`):

```
fine_amount = max(0, (return_date − due_date) in days) × FINE_PER_DAY
```

The Fine is created automatically by the `POST /return` endpoint when a return is past due.

---

## Notifications

| Method | Path                            | Auth | Description                            |
|--------|---------------------------------|------|----------------------------------------|
| GET    | `/notifications/`               | any  | List own notifications. `?unread_only=true` |
| GET    | `/notifications/unread-count`   | any  | `{ count }`                            |
| POST   | `/notifications/{id}/read`      | any  | Mark a single one as read              |
| POST   | `/notifications/read-all`       | any  | Bulk-read all of the current user's    |

Categories: `info`, `success`, `warning`, `overdue`, `fine`.

The backend emits notifications automatically on book issue and on fine creation; additional events can be added in `crud._notify`.

---

## Reports

| Method | Path                          | Auth                | Notes                              |
|--------|-------------------------------|---------------------|------------------------------------|
| GET    | `/reports/summary`            | admin / librarian   | `{ by_category, monthly_activity, top_borrowers, most_borrowed_books }` |
| GET    | `/reports/books.csv`          | admin / librarian   | CSV download                       |
| GET    | `/reports/transactions.csv`   | admin / librarian   | CSV download                       |
| GET    | `/reports/fines.csv`          | admin / librarian   | CSV download                       |

---

## Dashboard

| Method | Path         | Auth | Response                                                                                                  |
|--------|--------------|------|-----------------------------------------------------------------------------------------------------------|
| GET    | `/dashboard` | any  | `{ total_books, available_books, borrowed_books, overdue_books, total_borrowers, total_users, active_users, total_transactions, total_fines_collected, total_fines_outstanding }` |

---

## Error format

All errors follow FastAPI's standard:

```json
{ "detail": "Human-readable error message" }
```

HTTP codes used: `400` validation, `401` unauthenticated, `403` insufficient role, `404` not found, `500` server error.
