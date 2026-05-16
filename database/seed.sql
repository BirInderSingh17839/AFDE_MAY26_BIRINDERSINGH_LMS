-- =====================================================================
-- Library Management System — Seed Data
-- =====================================================================
-- Loads a starter catalog and a few borrowers so the UI looks alive.
-- Run after schema.sql:
--   psql -d library_db -f seed.sql
-- =====================================================================

INSERT INTO books (title, author, category, isbn, availability_status) VALUES
    ('The Pragmatic Programmer',  'Andrew Hunt',         'Programming', '978-0201616224', 'Available'),
    ('Clean Code',                'Robert C. Martin',    'Programming', '978-0132350884', 'Available'),
    ('Design Patterns',           'Erich Gamma',         'Programming', '978-0201633610', 'Available'),
    ('Atomic Habits',             'James Clear',         'Self-help',   '978-0735211292', 'Available'),
    ('Sapiens',                   'Yuval Noah Harari',   'History',     '978-0062316097', 'Available'),
    ('1984',                      'George Orwell',       'Fiction',     '978-0451524935', 'Available'),
    ('To Kill a Mockingbird',     'Harper Lee',          'Fiction',     '978-0061120084', 'Available'),
    ('The Lean Startup',          'Eric Ries',           'Business',    '978-0307887894', 'Available'),
    ('Deep Work',                 'Cal Newport',         'Self-help',   '978-1455586691', 'Available'),
    ('A Brief History of Time',   'Stephen Hawking',     'Science',     '978-0553380163', 'Available');

INSERT INTO borrowers (borrower_name, email, phone) VALUES
    ('Aarav Sharma',   'aarav.sharma@example.com',   '+91-9876500001'),
    ('Priya Patel',    'priya.patel@example.com',    '+91-9876500002'),
    ('Rahul Verma',    'rahul.verma@example.com',    '+91-9876500003'),
    ('Sneha Reddy',    'sneha.reddy@example.com',    '+91-9876500004');
