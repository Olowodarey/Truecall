# PostgreSQL Setup - Quick Start

## ✅ What's Done

- PostgreSQL driver installed (`pg`, `typeorm`)
- Database configuration added to `.env`
- User entity created with proper schema
- UsersService rewritten to use PostgreSQL
- Duplicate Twitter prevention implemented
- Migration script ready

## 🚀 Quick Setup (3 Steps)

### Step 1: Create Database

```bash
cd backend
pnpm run db:setup
```

This will create the `truecall` database in PostgreSQL.

### Step 2: Migrate Existing Data (Optional)

If you have users in `backend/data/users.json`:

```bash
pnpm run db:migrate
```

This transfers all JSON data to PostgreSQL.

### Step 3: Start Backend

```bash
pnpm start:dev
```

TypeORM will automatically create the `users` table!

## ✅ Verification

Check if it's working:

```bash
# Connect to database
psql -U postgres -d truecall

# View users table
\d users

# See all users
SELECT * FROM users;

# Exit
\q
```

## 📊 Database Schema

```sql
CREATE TABLE users (
  address         VARCHAR(42) PRIMARY KEY,
  twitterId       VARCHAR(255) UNIQUE,
  twitterHandle   VARCHAR(255),
  twitterAvatar   TEXT,
  verifiedAt      BIGINT,
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Your Configuration

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=kage
DATABASE_NAME=truecall
```

## 🎯 What Changed

### Before (JSON File):

```
backend/data/users.json
[
  {"address": "0x...", "twitterHandle": "..."}
]
```

### After (PostgreSQL):

```
PostgreSQL Database: truecall
Table: users
```

## Benefits

- ⚡ **Faster** - Indexed queries
- 🔒 **Safer** - Transactions prevent data loss
- 🚀 **Scalable** - Handles thousands of users
- 💪 **Production-ready** - Industry standard

## Troubleshooting

### PostgreSQL not running?

```bash
sudo systemctl start postgresql
```

### Can't connect?

```bash
# Reset password
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'kage';
\q
```

### Database doesn't exist?

```bash
cd backend
pnpm run db:setup
```

## Next Steps

1. ✅ Setup database: `pnpm run db:setup`
2. ✅ Migrate data: `pnpm run db:migrate` (if needed)
3. ✅ Start backend: `pnpm start:dev`
4. ✅ Test: Link Twitter account
5. ✅ Verify: `psql -U postgres -d truecall -c "SELECT * FROM users;"`

Your Twitter verification system now uses PostgreSQL! 🎉
