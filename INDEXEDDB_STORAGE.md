# IndexedDB Storage for Recall Extension

## Overview

The extension now uses **IndexedDB** instead of `chrome.storage.local` or `localStorage` for better performance and capacity.

## Stored Data

### Authentication

- `recallAuthToken` - JWT authentication token
- `recallUser` - User info (name, email, id)

### Study Session

- `recallCards` - Generated study cards array
- `recallCalibrationCompleted` - Boolean flag
- `recallLastSourceId` - Last created source ID
- `recallTopic` - Current topic name
- `recallExamDate` - Exam date

## Database Details

- **Database Name**: `RecallExtensionDB`
- **Store Name**: `recallStore`
- **Version**: 1

## Benefits of IndexedDB

1. **Larger Storage**: Can store MBs of data (vs 5MB localStorage limit)
2. **Better Performance**: Asynchronous, doesn't block UI
3. **Complex Data**: Can store objects directly without JSON stringify/parse
4. **Extension-Specific**: Storage is scoped to the extension, not shared with websites
5. **Persistent**: Data persists across browser sessions

## Developer Tools

### View All Data (Console)

Open the extension popup, then open developer tools (F12), and run:

```javascript
await recallDebug.viewDB();
```

### Clear All Data

```javascript
await recallDebug.clearDB();
```

### View in Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Expand **IndexedDB** in the left sidebar
4. Find `RecallExtensionDB` → `recallStore`
5. You can view, edit, or delete entries directly

## Migration from chrome.storage.local

The extension automatically migrates to IndexedDB. If you had data in `chrome.storage.local`, it won't be automatically migrated. To reset:

1. Open console and run:
   ```javascript
   chrome.storage.local.clear();
   ```
2. Logout and login again

## API

### Save Data

```javascript
await saveToIndexedDB(key, value);
```

### Get Data

```javascript
const value = await getFromIndexedDB(key);
```

### Remove Data

```javascript
await removeFromIndexedDB(key);
```

### Clear All

```javascript
await clearAllIndexedDB();
```

## Troubleshooting

### Data not persisting?

- Check if IndexedDB is supported: `'indexedDB' in window`
- Check browser console for errors
- View IndexedDB in Application tab to verify data is being stored

### Old data showing?

- Clear the database using `recallDebug.clearDB()`
- Or manually delete via Application → IndexedDB in DevTools

### Can't see IndexedDB in DevTools?

- Make sure the extension popup is open
- The database is created on first use (after opening popup)
- Refresh DevTools after opening popup

## Security Notes

- IndexedDB data is stored locally on the user's machine
- Data is scoped to the extension origin
- JWT tokens are stored (consider adding encryption for sensitive production data)
- IndexedDB is not synced across devices (unlike chrome.storage.sync)
