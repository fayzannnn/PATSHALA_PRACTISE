# Expense Tracker

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` to your MongoDB Atlas connection string and ensure your Atlas network access allows the machine running the app.
4. Run `npm run dev`.

The server uses the `expense_tracker` database by default. Override it with `MONGODB_DB` if needed. Never commit `.env` or share your Atlas connection string.

## Move existing SQLite data to MongoDB

Back up `data.sqlite` before migration. Set `SQLITE_PATH` to the SQLite file and set `MONGODB_URI` / `MONGODB_DB` to the target Atlas database, then run:

```sh
npm run migrate:sqlite
```

The migration stops if any target MongoDB collections already contain data. It imports accounts, expenses, budgets, and password reset tokens in one transaction. After moving accounts, users may need to sign in again because MongoDB user IDs differ from SQLite IDs.

After confirming the imported data in Atlas, start the app with `npm run dev`. The SQLite file is only used by the migration script; the application server now reads and writes MongoDB.

## Production

Build the frontend with `npm ci --include=dev && npm run build`, then start the combined API and static frontend with `npm start`. The explicit `--include=dev` is needed on hosts that set `NODE_ENV=production` during builds because Vite is a development dependency. Configure `NODE_ENV=production`, `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, and `FRONTEND_URL` in the hosting provider's environment settings.
