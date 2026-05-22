# Sample datasets for the ETL pipeline

Pre-built fixtures for the `/etl/upload` endpoint and the **ETL Pipeline**
page in the frontend. Both CSV and XLSX formats are provided so you can
exercise both code paths in the extractor.

## 500-row datasets (recommended for capstone demo)

| File                          | Rows | Notes                                     |
|-------------------------------|------|-------------------------------------------|
| `books_500.csv`               | 500  | Clean book catalog                        |
| `books_500.xlsx`              | 500  | Same data, Excel format                   |
| `borrowers_500.csv`           | 500  | Clean borrower / member roster            |
| `borrowers_500.xlsx`          | 500  | Same data, Excel format                   |
| `transactions_500.csv`        | 500  | ~18 months of borrow/return events        |
| `transactions_500.xlsx`       | 500  | Same data, Excel format                   |

Profile of the transactions set: ~72% returned, ~28% of returns are late
(producing fines at the configured rate of 0.50/day), ~145 still on loan.
Spans 24 book categories.

## Smaller / legacy datasets

| File                          | Rows | Notes                                     |
|-------------------------------|------|-------------------------------------------|
| `books.csv`                   | 200  | Earlier sample, kept for compatibility    |
| `borrowers.csv`               | 180  |                                           |
| `transactions.csv`            | 300  |                                           |
| `borrowers_dirty_demo.csv`    |  42  | **Intentionally dirty** — for ETL demo    |

## Recommended load order

Transactions reference `book_id` and `borrower_id` by row number, so load
books and borrowers first:

1. **Books** → upload `books_500.csv` (entity = books)
2. **Borrowers** → upload `borrowers_500.csv` (entity = borrowers)
3. **Transactions** → upload `transactions_500.csv` (entity = transactions)

Each upload is idempotent: rerunning the same file won't create duplicates
because the loader keys on ISBN, email, and
`(book_id, borrower_id, borrow_date)` respectively.

## What the dirty file demonstrates

`borrowers_dirty_demo.csv` contains:

* rows with blank `email` (rejected — missing required field)
* one fully duplicated row (deduped silently)
* one row with a 3-digit phone and empty name (rejected)

Uploading it produces an ETL log with `status = partial`, several failed
rows listed under *Failed records*, and a smaller `loaded` count than
`extracted`.

## Generating fresh data

`generate.py` regenerates the smaller fixtures (`books.csv`,
`borrowers.csv`, `transactions.csv`) with a deterministic random seed.
Edit the row counts at the top of the file to produce different sizes.

```bash
cd datasets
python generate.py
```

The 500-row files were generated with a fixed seed (`random.seed(42)`)
and a wider name/title/author pool — re-running with the same parameters
produces byte-identical output.
