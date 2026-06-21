# React Navigation Deep Link Fix

## Problem Summary
The Android system successfully caught the deep link `https://kneeoa.online/reset-password?token=xxx` and handed it to the app, but React Navigation didn't recognize the URL structure and ignored it.

## Root Cause

### Incorrect Configuration
The original linking config had an overly complex structure:

```javascript
// ❌ WRONG - Too complex, React Navigation couldn't parse it
ResetPassword: {
    path: 'reset-password',
    parse: {
        token: (token) => token,
    },
}
```

React Navigation expected the token in the URL path (e.g., `reset-password/:token`), but the actual URL has the token in query parameters (`?token=xxx`).

### Correct Configuration
The simplified config works because:

```javascript
// ✅ CORRECT - Simple path matching
ResetPassword: 'reset-password'
```

React Navigation will:
1. Match the path `reset-password`
2. Automatically extract query parameters
3. Pass them as navigation params to the screen

## The Fix

### File: `App.js`

**Before:**
```javascript
linking={{
    prefixes: [DEEP_LINK_PREFIX],
    config: {
        screens: {
            ResetPassword: {
                path: 'reset-password',
                parse: {
                    token: (token) => token,
                },
            },
        },
    },
}}
```

**After:**
```javascript
linking={{
    prefixes: [DEEP_LINK_PREFIX],
    config: {
        screens: {
            ResetPassword: 'reset-password',
        },
    },
}}
```

## How It Works

### URL Structure
```
https://kneeoa.online/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### React Navigation Flow
1. **Prefix Match**: `https://kneeoa.online/` matches `DEEP_LINK_PREFIX`
2. **Path Match**: `/reset-password` matches `ResetPassword: 'reset-password'`
3. **Query Extraction**: `?token=xxx` is automatically extracted
4. **Navigation**: `navigation.navigate('ResetPassword', { token: 'xxx' })`

### Deep Link Handler
The `NavigationHandler` component already correctly extracts the token:

```javascript
const parsedUrl = new URL(url.replace('https://kneeoa.online', 'https://example.com'));
const path = parsedUrl.pathname;  // '/reset-password'
const token = parsedUrl.searchParams.get('token');  // 'eyJhbG...'

if (path.startsWith('/reset-password')) {
    navigationRef.navigate('ResetPassword', { resetToken: token });
}
```

## Testing the Fix

### 1. Test with Deep Link
```bash
# Android - Simulate deep link
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://kneeoa.online/reset-password?token=TEST_TOKEN_123" \
  com.yourapp.package

# Or click a link in browser
# Open: https://kneeoa.online/reset-password?token=TEST_TOKEN_123
```

### 2. Expected Behavior
- App opens (or comes to foreground)
- Deep link is captured
- Navigation goes to ResetPassword screen
- Token is passed to the screen component
- Screen displays the reset password form with the token

### 3. Verify in Logs
Look for:
```
[DeepLink] Received URL: https://kneeoa.online/reset-password?token=xxx
[DeepLink] Routing to ResetPassword with token
Navigation ready
```

## Additional Notes

### Why the Old Config Failed
- React Navigation's `parse` option is for **path parameters**, not query parameters
- When you define `parse: { token: ... }`, it expects URLs like `reset-password/token-value`
- Query parameters are handled automatically by React Navigation

### Query Parameters vs Path Parameters

| Type | Example | How to Access |
|------|---------|---------------|
| **Path Parameter** | `/reset-password/abc123` | `route.params.token` |
| **Query Parameter** | `/reset-password?token=abc123` | `route.params.token` |

React Navigation handles both the same way in the screen component!

### Screen Component Usage
In `ResetPasswordScreen.js`:

```javascript
const ResetPasswordScreen = ({ route, navigation }) => {
    const { resetToken } = route.params || {};
    
    useEffect(() => {
        if (resetToken) {
            // Process the token
        }
    }, [resetToken]);
    
    return (
        // Your reset password UI
    );
};
```

## Testing Checklist

- [ ] Deep link opens app from background
- [ ] Deep link opens app from closed state
- [ ] Token is correctly extracted from URL
- [ ] ResetPassword screen receives the token
- [ ] Token validation works (3 parts separated by dots)
- [ ] Invalid tokens show appropriate error
- [ ] No crashes or navigation errors in logs

## Next Steps

1. Test with a real password reset token from your backend
2. Verify the token is passed correctly to `ResetPasswordScreen`
3. Test edge cases:
   - Missing token parameter
   - Invalid token format
   - Expired token
4. Consider adding analytics to track deep link success rate

## Files Modified

- `App.js` - Simplified linking configuration

## Related Files

- `src/screens/ResetPasswordScreen.js` - Uses the token
- `src/services/api.js` - Validates and uses the token for password reset
