-- =====================================================================
-- Library Management System — PostgreSQL Schema
-- =====================================================================
-- Run once after creating the database:
--   createdb library_db
--   psql -d library_db -f schema.sql
-- =====================================================================

DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS borrowers CASCADE;

-- ---------- Books ----------
CREATE TABLE books (
    book_id              SERIAL PRIMARY KEY,
    title                VARCHAR(255) NOT NULL,
    author               VARCHAR(255) NOT NULL,
    category             VARCHAR(100) NOT NULL,
    isbn                 VARCHAR(50)  NOT NULL UNIQUE,
    availability_status  VARCHAR(20)  NOT NULL DEFAULT 'Available'
);

CREATE INDEX idx_books_title    ON books (title);
CREATE INDEX idx_books_author   ON books (author);
CREATE INDEX idx_books_category ON books (category);

-- ---------- Borrowers ----------
CREATE TABLE borrowers (
    borrower_id    SERIAL PRIMARY KEY,
    borrower_name  VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    phone          VARCHAR(20)  NOT NULL
);

CREATE INDEX idx_borrowers_name ON borrowers (borrower_name);

-- ---------- Transactions ----------
CREATE TABLE transactions (
    transaction_id  SERIAL PRIMARY KEY,
    book_id         INTEGER NOT NULL REFERENCES books (book_id)      ON DELETE CASCADE,
    borrower_id     INTEGER NOT NULL REFERENCES borrowers (borrower_id) ON DELETE CASCADE,
    borrow_date     TIMESTAMP NOT NULL DEFAULT NOW(),
    return_date     TIMESTAMP
);

CREATE INDEX idx_transactions_book     ON transactions (book_id);
CREATE INDEX idx_transactions_borrower ON transactions (borrower_id);
