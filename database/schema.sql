-- =====================================================================
-- Library Management System — SQLite Schema (v2)
-- =====================================================================
-- This file is provided for reference only. In normal use, SQLAlchemy
-- creates tables automatically on app startup (see backend/database.py
-- and backend/main.py).
--
-- Apply manually if you want to bootstrap the DB outside the app:
--   sqlite3 backend/library.db < database/schema.sql
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS fines;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS borrowers;

-- ---------- Books ----------
CREATE TABLE books (
    book_id              INTEGER PRIMARY KEY AUTOINCREMENT,
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
    borrower_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    borrower_name  VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    phone          VARCHAR(20)  NOT NULL
);
CREATE INDEX idx_borrowers_name ON borrowers (borrower_name);

-- ---------- Users (auth) ----------
CREATE TABLE users (
    user_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username       VARCHAR(80)  NOT NULL UNIQUE,
    email          VARCHAR(150) NOT NULL UNIQUE,
    full_name      VARCHAR(150) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20)  NOT NULL DEFAULT 'student',
    is_active      BOOLEAN      NOT NULL DEFAULT 1,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    borrower_id    INTEGER REFERENCES borrowers (borrower_id) ON DELETE SET NULL
);
CREATE INDEX idx_users_role ON users (role);

-- ---------- Transactions ----------
CREATE TABLE transactions (
    transaction_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id         INTEGER NOT NULL REFERENCES books (book_id)         ON DELETE CASCADE,
    borrower_id     INTEGER NOT NULL REFERENCES borrowers (borrower_id) ON DELETE CASCADE,
    borrow_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date        DATETIME,
    return_date     DATETIME,
    fine_amount     REAL     NOT NULL DEFAULT 0.0
);
CREATE INDEX idx_transactions_book     ON transactions (book_id);
CREATE INDEX idx_transactions_borrower ON transactions (borrower_id);
CREATE INDEX idx_transactions_due      ON transactions (due_date);

-- ---------- Fines ----------
CREATE TABLE fines (
    fine_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id  INTEGER NOT NULL UNIQUE REFERENCES transactions (transaction_id) ON DELETE CASCADE,
    borrower_id     INTEGER NOT NULL REFERENCES borrowers (borrower_id) ON DELETE CASCADE,
    amount          REAL     NOT NULL DEFAULT 0.0,
    days_overdue    INTEGER  NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at         DATETIME
);
CREATE INDEX idx_fines_status   ON fines (status);
CREATE INDEX idx_fines_borrower ON fines (borrower_id);

-- ---------- Notifications ----------
CREATE TABLE notifications (
    notification_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    title            VARCHAR(150) NOT NULL,
    message          VARCHAR(500) NOT NULL,
    category         VARCHAR(30)  NOT NULL DEFAULT 'info',
    is_read          BOOLEAN      NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_read ON notifications (is_read);

-- ---------- ETL audit (Phase 2) ----------
CREATE TABLE etl_logs (
    log_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    entity         VARCHAR(40)  NOT NULL,
    filename       VARCHAR(255),
    extracted      INTEGER NOT NULL DEFAULT 0,
    transformed    INTEGER NOT NULL DEFAULT 0,
    loaded         INTEGER NOT NULL DEFAULT 0,
    failed         INTEGER NOT NULL DEFAULT 0,
    duration_ms    INTEGER NOT NULL DEFAULT 0,
    status         VARCHAR(20)  NOT NULL DEFAULT 'ok',
    error_message  VARCHAR(500),
    summary        VARCHAR(2000),
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id        INTEGER REFERENCES users (user_id) ON DELETE SET NULL
);
CREATE INDEX idx_etl_logs_entity   ON etl_logs (entity);
CREATE INDEX idx_etl_logs_status   ON etl_logs (status);
CREATE INDEX idx_etl_logs_created  ON etl_logs (created_at);

CREATE TABLE overdue_reports (
    report_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_transactions   INTEGER NOT NULL DEFAULT 0,
    overdue_count        INTEGER NOT NULL DEFAULT 0,
    overdue_percentage   REAL    NOT NULL DEFAULT 0,
    average_days_overdue REAL    NOT NULL DEFAULT 0,
    estimated_fines      REAL    NOT NULL DEFAULT 0,
    details              VARCHAR(4000)
);
CREATE INDEX idx_overdue_reports_date ON overdue_reports (snapshot_date);

CREATE TABLE analytics_summary (
    summary_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    metric         VARCHAR(80)  NOT NULL,
    dimension      VARCHAR(120),
    value_numeric  REAL,
    value_text     VARCHAR(200),
    computed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_analytics_summary_metric ON analytics_summary (metric);
CREATE INDEX idx_analytics_summary_computed ON analytics_summary (computed_at);
