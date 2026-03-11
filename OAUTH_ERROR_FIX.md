# TROUBLESHOOTING: "bad client id" Error

## Problem

OAuth2 request failed: Service responded with error: 'bad client id'

## Root Cause

Chrome Extensions have a different OAuth2 setup than web applications. Your Client ID needs to know your Extension ID.

## Solution Steps

### Step 1: Get Your Extension ID

1. Go to `chrome://extensions/`
2. Find your "Recall" extension
3. Copy the **Extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
   - It's shown under the extension name

### Step 2: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (the one you created for Recall)

### Step 3: Delete Old OAuth Client (Optional but Recommended)

1. Go to **APIs & Services** → **Credentials**
2. Find your existing OAuth 2.0 Client ID
3. Click the trash icon to delete it
4. Confirm deletion

### Step 4: Create NEW Chrome Extension OAuth Client

1. Still in **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. **IMPORTANT**: For Application type, select **Chrome extension** (NOT Web application)
   - If you don't see "Chrome extension" option:
     - Select "Chrome app"
     - Or use the old method below 👇
4. In the "Application ID" field, paste your Extension ID from Step 1
5. Name it: `Recall Chrome Extension`
6. Click **Create**
7. Copy the NEW Client ID

### Alternative Method (If Chrome Extension Type Not Available)

If you can't find "Chrome extension" as an application type:

1. Create as **Web application** type
2. Add Authorized JavaScript origins:
   ```
   chrome-extension://YOUR_EXTENSION_ID_HERE
   ```
   Replace YOUR_EXTENSION_ID_HERE with your actual Extension ID
3. Add Authorized redirect URIs:
   ```
   https://YOUR_EXTENSION_ID_HERE.chromiumapp.org/
   ```
   (Note the trailing slash!)

### Step 5: Update manifest.json

1. Open `extension/manifest.json`
2. Replace the Client ID with your NEW one:
   ```json
   "oauth2": {
     "client_id": "YOUR_NEW_CLIENT_ID.apps.googleusercontent.com",
     "scopes": ["openid", "email", "profile"]
   }
   ```

### Step 6: Reload Extension

1. Go to `chrome://extensions/`
2. Find your extension
3. Click the reload button (circular arrow icon)

### Step 7: Test Again

1. Click the extension icon
2. Click "Sign in with Google"
3. Should now work! ✅

## Additional Checks

### Verify OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Make sure:
   - ✅ App name is set
   - ✅ User support email is set
   - ✅ Scopes include: openid, email, profile
   - ✅ If "External" type: Add yourself as a test user

### Add Test Users (If Using External Type)

1. In OAuth consent screen settings
2. Scroll to "Test users"
3. Click "Add Users"
4. Add your Gmail address
5. Click "Save"

## Still Having Issues?

### Error: "Access blocked: This app's request is invalid"

- Your OAuth consent screen might not have the correct scopes
- Make sure you added: openid, email, profile

### Error: "Redirect URI mismatch"

- Using Web application type? Add the redirect URI mentioned above
- Format must be exact: `https://EXTENSION_ID.chromiumapp.org/`

### Error: "This app isn't verified"

- Normal for testing! Click "Advanced" → "Go to Recall (unsafe)"
- For production, you'll need to verify the app with Google

### Extension ID Changed?

- If you reload the extension unpacked, the Extension ID might change
- You'll need to update the OAuth client with the new Extension ID

## Quick Verification Checklist

- [ ] Extension ID copied correctly (no spaces)
- [ ] OAuth client type is "Chrome extension" or configured redirect URI
- [ ] Client ID copied to manifest.json exactly
- [ ] Extension reloaded after changing manifest.json
- [ ] OAuth consent screen has all required scopes
- [ ] You're added as a test user (if External type)
- [ ] You're using the same Google account in Chrome

## Example Extension ID

Your extension ID looks something like: `mgbfgdpnpjdbpdkeakonhmhcnffbcpdn`
(This is random, yours will be different)

## Why This Happens

Chrome Extensions have unique security requirements. Each extension gets a unique ID, and Google needs to whitelist that specific Extension ID to allow OAuth. That's why web app Client IDs don't work for extensions.
