# API Documentation — Library Management System

Base URL: `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs` (Swagger UI) and `/redoc`.

All requests/responses use `application/json`.

---

## Health

### `GET /`
```json
{
  "app": "Library Management System",
  "status": "ok",
  "docs": "/docs"
}
```

## Dashboard

### `GET /dashboard`
```json
{
  "total_books": 10,
  "available_books": 9,
  "borrowed_books": 1,
  "total_borrowers": 4,
  "total_transactions": 1
}
```

---

## Books

### `GET /books`
Returns an array of book objects.
```json
[
  {
    "book_id": 1,
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "category": "Programming",
    "isbn": "978-0132350884",
    "availability_status": "Available"
  }
]
```

### `GET /books/{book_id}`
Returns a single book or `404`.

### `POST /books`
Request body:
```json
{
  "title": "The Pragmatic Programmer",
  "author": "Andrew Hunt",
  "category": "Programming",
  "isbn": "978-0201616224",
  "availability_status": "Available"
}
```
Response: `201` with created book.
Errors: `400` if ISBN already exists.

### `PUT /books/{book_id}`
All fields optional — only provided ones are updated.
```json
{ "category": "Software Engineering" }
```

### `DELETE /books/{book_id}`
```json
{ "detail": "Book deleted successfully" }
```

---

## Borrowers

### `GET /borrowers`
```json
[
  {
    "borrower_id": 1,
    "borrower_name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "phone": "+91-9876500001"
  }
]
```

### `POST /borrowers`
```json
{
  "borrower_name": "Priya Patel",
  "email": "priya.patel@example.com",
  "phone": "+91-9876500002"
}
```

### `PUT /borrowers/{id}` / `DELETE /borrowers/{id}`
Standard update / delete semantics.

---

## Borrow / Return

### `POST /borrow`
Request:
```json
{ "book_id": 1, "borrower_id": 2 }
```
Response (201):
```json
{
  "transaction_id": 1,
  "book_id": 1,
  "borrower_id": 2,
  "borrow_date": "2026-05-16T10:30:00",
  "return_date": null,
  "book_title": "Clean Code",
  "borrower_name": "Priya Patel"
}
```
Errors:
- `400` Book not available
- `400` Book / borrower not found

### `POST /return`
Request:
```json
{ "transaction_id": 1 }
```
Response: transaction object with `return_date` populated and book marked `Available`.

### `GET /transactions`
Returns array of transaction objects (most recent first).

---

## Search

### `GET /search`
Query parameters (all optional, combine freely):

| Param      | Description                                       |
|------------|---------------------------------------------------|
| `q`        | Keyword across title, author, category, ISBN      |
| `title`    | Substring match on title                          |
| `author`   | Substring match on author                         |
| `category` | Substring match on category                       |

Examples:
- `GET /search?q=clean`
- `GET /search?author=Martin&category=Programming`
- `GET /search?title=1984`

Response: array of `BookOut` objects.

---

## Error Format

FastAPI returns errors in the standard form:
```json
{ "detail": "Book not found" }
```
HTTP status codes follow REST conventions (`200`, `201`, `400`, `404`, `422`).
