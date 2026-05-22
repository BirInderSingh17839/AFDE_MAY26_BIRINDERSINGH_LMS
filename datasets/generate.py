"""
Regenerate the sample CSV datasets.

Usage:  python generate.py
"""
import os
import random
import csv
from datetime import datetime, timedelta

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
random.seed(42)  # deterministic output

AUTHORS = [
    "Andrew Hunt", "Robert C. Martin", "Erich Gamma", "James Clear", "Yuval Noah Harari",
    "George Orwell", "Harper Lee", "Eric Ries", "Cal Newport", "Stephen Hawking",
    "Jane Austen", "Leo Tolstoy", "Fyodor Dostoevsky", "Agatha Christie", "Charles Dickens",
    "Mark Twain", "Virginia Woolf", "Toni Morrison", "Gabriel García Márquez", "Haruki Murakami",
    "Margaret Atwood", "Ursula K. Le Guin", "Isaac Asimov", "Arthur C. Clarke", "Philip K. Dick",
    "Frank Herbert", "Neil Gaiman", "Terry Pratchett", "Brandon Sanderson", "Patrick Rothfuss",
]
CATEGORIES = [
    "Programming", "Self-help", "History", "Fiction", "Business", "Science", "Biography",
    "Mystery", "Romance", "Fantasy", "Thriller", "Philosophy", "Education", "Children",
    "Poetry", "Reference",
]
TITLES = [
    "The Pragmatic Programmer", "Clean Code", "Design Patterns", "Atomic Habits", "Sapiens",
    "1984", "To Kill a Mockingbird", "The Lean Startup", "Deep Work", "A Brief History of Time",
    "Pride and Prejudice", "War and Peace", "Crime and Punishment", "Murder on the Orient Express",
    "Great Expectations", "Adventures of Tom Sawyer", "Mrs Dalloway", "Beloved",
    "One Hundred Years of Solitude", "Norwegian Wood", "The Handmaid's Tale", "A Wizard of Earthsea",
    "Foundation", "2001: A Space Odyssey", "Do Androids Dream of Electric Sheep?", "Dune",
    "American Gods", "Mort", "Mistborn", "The Name of the Wind", "Refactoring", "Code Complete",
]

FIRST = [
    "Aarav", "Priya", "Rahul", "Sneha", "Vikram", "Anika", "Rohan", "Isha", "Karan", "Meera",
    "Arjun", "Diya", "Aditya", "Riya", "Aryan", "Sara", "Krish", "Tara", "Dev", "Anya",
    "John", "Jane", "Alex", "Emma", "Liam", "Olivia", "Noah", "Ava", "Mason", "Sophia",
    "Wei", "Yuki", "Hiro", "Akira", "Mei", "Sakura", "Ren", "Aiko", "Kenji", "Hana",
]
LAST = [
    "Sharma", "Patel", "Verma", "Reddy", "Singh", "Kumar", "Gupta", "Rao", "Iyer", "Nair",
    "Smith", "Johnson", "Williams", "Brown", "Jones",
    "Tanaka", "Suzuki", "Yamamoto", "Kobayashi", "Sato", "Watanabe",
]


def gen_books(n=200):
    isbn_ctr = 9780000000000
    rows, seen = [], set()
    for _ in range(n):
        title = random.choice(TITLES)
        if random.random() < 0.15:
            title = f"{title} Vol. {random.randint(2, 4)}"
        isbn_ctr += random.randint(1, 7)
        isbn = f"978-{isbn_ctr:010d}"[:17]
        if isbn in seen:
            continue
        seen.add(isbn)
        rows.append({
            "title": title,
            "author": random.choice(AUTHORS),
            "category": random.choice(CATEGORIES),
            "isbn": isbn,
            "availability_status": random.choices(["Available", "Borrowed"], weights=[8, 2])[0],
        })
    return rows


def gen_borrowers(n=180):
    rows, seen = [], set()
    for i in range(n):
        fn, ln = random.choice(FIRST), random.choice(LAST)
        email = f"{fn.lower()}.{ln.lower()}{i:03d}@example.com"
        if email in seen:
            continue
        seen.add(email)
        rows.append({
            "borrower_name": f"{fn} {ln}",
            "email": email,
            "phone": f"+91-{random.randint(9000000000, 9999999999)}",
        })
    return rows


def gen_transactions(n_books, n_borrowers, n=300):
    today = datetime(2026, 5, 21)
    rows = []
    for _ in range(n):
        bid = random.randint(1, n_books)
        brid = random.randint(1, n_borrowers)
        borrow_date = today - timedelta(days=random.randint(1, 365))
        loan_period = random.choice([7, 14, 21, 30])
        due_date = borrow_date + timedelta(days=loan_period)
        returned = random.random() < 0.7
        return_date = ""
        fine_amount = 0.0
        if returned:
            if random.random() < 0.25:
                rd = due_date + timedelta(days=random.randint(1, 25))
                fine_amount = round((rd - due_date).days * 0.50, 2)
                return_date = rd
            else:
                return_date = borrow_date + timedelta(days=random.randint(1, loan_period))
            return_date = return_date.strftime("%Y-%m-%d")
        rows.append({
            "book_id": bid,
            "borrower_id": brid,
            "borrow_date": borrow_date.strftime("%Y-%m-%d"),
            "due_date": due_date.strftime("%Y-%m-%d"),
            "return_date": return_date,
            "fine_amount": fine_amount,
        })
    return rows


def write_csv(path, rows, header):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    books = gen_books()
    write_csv(os.path.join(OUT_DIR, "books.csv"), books,
              ["title", "author", "category", "isbn", "availability_status"])
    borrowers = gen_borrowers()
    write_csv(os.path.join(OUT_DIR, "borrowers.csv"), borrowers,
              ["borrower_name", "email", "phone"])
    txns = gen_transactions(len(books), len(borrowers))
    write_csv(os.path.join(OUT_DIR, "transactions.csv"), txns,
              ["book_id", "borrower_id", "borrow_date", "due_date", "return_date", "fine_amount"])
    print(f"Wrote {len(books)} books, {len(borrowers)} borrowers, {len(txns)} transactions.")
