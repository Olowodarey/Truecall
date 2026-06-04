# 🔄 TrueCall CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing and deployment validation.

## 📋 Workflows

### 1. `ci.yml` - Main CI Pipeline

**Triggers**: Push or PR to main/master/develop  
**Purpose**: Smart change detection and validation

- ✅ Detects which parts of the codebase changed
- ✅ Only runs checks for changed code
- ✅ Runs backend and frontend checks in parallel
- ✅ Fails fast if any check fails

### 2. `backend-ci.yml` - Backend Validation

**Triggers**: Changes to `backend/**` folder  
**Purpose**: Validate backend before Railway deployment

**Checks**:

- 📥 Install dependencies with pnpm
- 🔍 Lint code (non-blocking)
- 🏗️ Build TypeScript
- ✅ Verify compilation success

**Prevents**:

- ❌ TypeScript compilation errors
- ❌ Missing dependencies
- ❌ Syntax errors
- ❌ Build configuration issues

### 3. `frontend-ci.yml` - Frontend Validation

**Triggers**: Changes to `frontend/**` folder  
**Purpose**: Validate frontend before Vercel deployment

**Checks**:

- 📥 Install dependencies with npm
- 🔍 Lint code (non-blocking)
- 🏗️ Build Next.js app
- ✅ Verify build success

**Prevents**:

- ❌ Next.js build errors
- ❌ TypeScript errors
- ❌ Component errors
- ❌ Missing environment variables

---

## 🎯 How It Works

### On Push to Main Branch:

```
1. GitHub receives push
2. CI workflow starts
3. Detects which files changed
4. Runs appropriate checks (backend/frontend)
5. All checks must pass ✅
6. If passed → Railway/Vercel deploy
7. If failed → Deployment blocked ❌
```

### Status Badges:

Add these to your main README.md:

```markdown
![Backend CI](https://github.com/YOUR_USERNAME/Truecall/workflows/Backend%20CI/badge.svg)
![Frontend CI](https://github.com/YOUR_USERNAME/Truecall/workflows/Frontend%20CI/badge.svg)
![CI](https://github.com/YOUR_USERNAME/Truecall/workflows/TrueCall%20CI/badge.svg)
```

---

## 🔧 Configuration

### Backend CI

- **Node Version**: 20.x
- **Package Manager**: pnpm
- **Working Directory**: `./backend`
- **Cache**: pnpm lockfile

### Frontend CI

- **Node Version**: 20.x
- **Package Manager**: npm
- **Working Directory**: `./frontend`
- **Cache**: npm package-lock

---

## 🚀 Integration with Railway

Railway will deploy your backend only after CI passes:

1. Push code to GitHub
2. GitHub Actions runs CI checks
3. If CI passes ✅ → Railway deploys
4. If CI fails ❌ → Railway skips deployment

### Railway Configuration:

In Railway dashboard, under **Settings** → **Deploy**:

- ✅ Enable "Wait for CI to pass before deploying"
- ✅ Railway will check GitHub commit status
- ✅ Only deploys on green checkmark

---

## 🧪 Running CI Locally

### Backend:

```bash
cd backend
pnpm install
pnpm run lint
pnpm run build
```

### Frontend:

```bash
cd frontend
npm install
npm run lint
npm run build
```

---

## 📊 CI Status

View workflow runs:

- Go to your GitHub repository
- Click **Actions** tab
- See all workflow runs and results

---

## 🐛 Troubleshooting

### CI fails but local build works?

- Check Node.js version matches (20.x)
- Verify lockfile is committed
- Check for missing dependencies

### CI is slow?

- Workflows use caching for dependencies
- First run is slow, subsequent runs are faster
- Cache lasts 7 days

### Need to skip CI?

- Add `[skip ci]` to commit message
- **Not recommended** for production branches

---

## 🎨 Customization

### Add Tests:

Edit `backend-ci.yml`:

```yaml
- name: 🧪 Run tests
  run: pnpm run test
```

### Add Type Checking:

```yaml
- name: 🔍 Type check
  run: pnpm run type-check
```

### Add Code Coverage:

```yaml
- name: 📊 Coverage
  run: pnpm run test:cov
```

---

## ✅ Benefits

- 🚫 **Prevents broken deployments** to production
- ⚡ **Fast feedback** on code issues
- 🔒 **Enforces code quality** standards
- 📊 **Clear status** on every commit
- 🤝 **Team confidence** in main branch
- 🔄 **Automated** no manual checks needed

---

**Your code is now protected! 🛡️**
