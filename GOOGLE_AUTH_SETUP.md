# Google Authentication Setup Guide

This guide will help you configure Google OAuth for the Recall Chrome Extension.

## Prerequisites

- Google Cloud Console account
- Chrome browser for testing

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Recall Extension" and click "Create"

## Step 2: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - App name: `Recall`
   - User support email: Your email
   - Developer contact: Your email
5. Click **Save and Continue**
6. On Scopes page, click **Add or Remove Scopes**
   - Add these scopes:
     - `openid`
     - `email`
     - `profile`
7. Click **Save and Continue**
8. Add test users (your email) if using External type
9. Click **Save and Continue**

## Step 3: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select application type: **Chrome Extension**
   - If Chrome Extension is not available, select **Web application** temporarily
4. Name it: `Recall Extension Client`
5. For Chrome Extension:
   - Get your extension ID:
     - Go to `chrome://extensions/`
     - Enable "Developer mode"
     - Load your extension (if not already loaded)
     - Copy the Extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
   - In the OAuth client configuration, the application ID is your Extension ID
6. Click **Create**
7. **Important**: Copy the Client ID that appears (format: `xxxxx.apps.googleusercontent.com`)

## Step 4: Configure Extension Manifest

1. Open `extension/manifest.json`
2. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID:
   ```json
   "oauth2": {
     "client_id": "123456789-abcdefghijk.apps.googleusercontent.com",
     "scopes": ["openid", "email", "profile"]
   }
   ```

## Step 5: Update Backend Environment (Optional)

The backend doesn't strictly require GOOGLE_CLIENT_ID since we're verifying tokens directly with Google's API, but you can add it for reference:

1. Open `backend/.env`
2. Add (optional):
   ```
   GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
   ```

## Step 6: Reload Extension

1. Go to `chrome://extensions/`
2. Find your "Recall" extension
3. Click the reload icon (circular arrow)

## Step 7: Test Google Sign-In

1. Click the extension icon in your browser
2. On the auth screen, click "Sign in with Google"
3. A popup should appear asking you to select your Google account
4. Grant permissions when prompted
5. You should be automatically logged in!

## Troubleshooting

### "Google Sign-In is not available"

- Make sure you've added `"identity"` permission to `manifest.json`
- Reload the extension after making changes

### "Invalid OAuth client"

- Verify the Client ID in manifest.json matches exactly with Google Cloud Console
- Make sure you're using the correct Extension ID
- Check that the OAuth consent screen is properly configured

### "Failed to get authentication token"

- Clear Chrome's cached tokens: Go to Settings → Privacy → Clear browsing data → Cookies
- Try removing and re-adding your Google account in Chrome

### "Access blocked: This app's request is invalid"

- Make sure all required scopes are added to the OAuth consent screen
- Verify the Extension ID matches between manifest and Google Cloud Console

### Backend responds with 401

- Check that the access token is being sent correctly
- Verify network connectivity to `https://www.googleapis.com`
- Check backend logs for specific error messages

## Security Notes

- Never commit your actual Client ID to public repositories
- Use environment-specific configuration for production deployments
- The backend verifies tokens directly with Google to ensure security
- Access tokens are temporary and expire automatically

## Production Deployment

For production:

1. Publish your extension to Chrome Web Store
2. Update OAuth client with the production Extension ID
3. Move OAuth consent screen from "Testing" to "In Production"
4. Consider using environment variables for different environments

## Additional Resources

- [Chrome Identity API Documentation](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Chrome Extension OAuth Best Practices](https://developer.chrome.com/docs/extensions/mv3/tut_oauth/)
