# Quick Start: Testing Authentication

## Start the System

### 1. Start MongoDB (if not already running)

```bash
mongod
```

### 2. Start Backend Server

```bash
cd backend
node src/index.js
```

You should see:

```
✓ MongoDB connected
Server running on http://localhost:3000
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder
5. Note the Extension ID (e.g., `abcdef...`)

## Test Email/Password Authentication

1. Click the extension icon in Chrome
2. You should see the auth screen with login form
3. Click "Don't have an account? Register"
4. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
5. Click "Register"
6. You should be logged in and see the setup screen

### Test Logout & Login

1. Open browser console (F12) and run:
   ```javascript
   chrome.storage.local.clear();
   ```
2. Refresh the extension popup
3. Click "Already have an account? Login"
4. Enter the same credentials
5. Click "Login"
6. You should be logged in again

## Test Google Authentication

### Prerequisites

Complete the setup in `GOOGLE_AUTH_SETUP.md` first!

### Test Flow

1. Click the extension icon
2. Click "Sign in with Google"
3. A Google sign-in popup should appear
4. Select your Google account
5. Grant permissions
6. You should be automatically logged in

### Verify in Backend

Check backend console logs for:

```
[Auth] Google login attempt { email: 'your@email.com' }
[Auth] Google login successful { userId: '...', email: '...' }
```

## Test Protected API Routes

### Create a Source

1. After logging in, fill in the setup form:
   - Topic: "JavaScript Basics"
   - Notes: "Variables, functions, loops..."
   - Exam Date: Select a future date
2. Click "Start Studying"
3. Watch the progress screen
4. Backend logs should show:
   ```
   [API] POST /api/sources received { userId: '...', hasTopic: true, ... }
   [Agents] Starting pipeline...
   ```

### Verify Authentication Required

1. Open browser console
2. Try calling API without token:
   ```javascript
   fetch("http://localhost:3000/api/sources", {
     headers: { "Content-Type": "application/json" },
   })
     .then((r) => r.json())
     .then(console.log);
   ```
3. Should return: `{ error: 'No token provided' }`

## Test Dashboard

1. Open browser to `http://localhost:3000/dashboard`
2. You should see a table of all sources and cards
3. Click "View Cards" on any source to see generated cards

## Common Issues & Solutions

### Extension doesn't load

- Check manifest.json for syntax errors
- Check browser console for errors (F12 → Console)

### Google Sign-In button does nothing

- Verify you've added "identity" permission to manifest.json
- Check that Client ID is configured correctly
- Look at background service worker console: `chrome://extensions/` → Details → "Inspect views: service worker"

### Backend returns 401

- Check JWT_SECRET is set in backend/.env
- Verify token is being stored: Open console and run:
  ```javascript
  chrome.storage.local.get(["recallAuthToken"], console.log);
  ```

### Cards not generating

- Check GEMINI_API_KEY in backend/.env
- Verify MongoDB is running
- Check backend console for error logs

### "Session expired" message

- JWT tokens expire after 7 days
- Click logout and login again
- Check backend JWT_SECRET hasn't changed

## API Endpoints Reference

### Auth Endpoints

- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login/register with Google

### Protected Endpoints (Require Bearer Token)

- `GET /api/sources` - List all user's sources
- `POST /api/sources` - Create new source
- `GET /api/sources/:id/status` - Check generation status
- `GET /api/sources/:id/cards` - Get cards for source

### Public Endpoints

- `GET /dashboard` - View all sources and cards (web UI)

## Next Steps

1. ✅ Authentication working
2. ✅ Card generation working
3. ✅ Quick calibration working
4. 🔄 Add spaced repetition algorithm
5. 🔄 Add progress tracking
6. 🔄 Add card review interface
7. 🔄 Add statistics dashboard
