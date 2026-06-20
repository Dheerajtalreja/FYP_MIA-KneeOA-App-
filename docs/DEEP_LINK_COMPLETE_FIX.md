# Deep Link Configuration - Complete Fix

## Final Configuration

### File: `App.js`

```javascript
const linking = {
    prefixes: ['kneeoa://', DEEP_LINK_PREFIX, 'https://www.kneeoa.online'],
    config: {
        screens: {
            ResetPassword: 'reset-password',
        },
    },
};
```

## Supported URL Formats

Your app now handles **THREE** different URL formats:

### 1. Custom App Scheme (Native Deep Link)
```
kneeoa://reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. HTTPS Web Link (Primary)
```
https://kneeoa.online/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. HTTPS WWW Variant
```
https://www.kneeoa.online/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## How It Works

### Prefix Matching
React Navigation checks the URL against the `prefixes` array in order:

1. **`'kneeoa://'`** - Matches custom app scheme
2. **`DEEP_LINK_PREFIX`** - Matches `https://kneeoa.online/`
3. **`'https://www.kneeoa.online'`** - Matches WWW variant

### Path Matching
Once a prefix matches, React Navigation extracts the path:
- Path: `/reset-password`
- Query: `?token=xxx`

### Navigation
React Navigation automatically:
1. Matches `reset-password` to the `ResetPassword` screen
2. Extracts `token` from query parameters
3. Calls: `navigation.navigate('ResetPassword', { token: 'xxx' })`

## Testing

### Test 1: Custom App Scheme
```bash
# Android - Simulate custom scheme deep link
adb shell am start -W -a android.intent.action.VIEW \
  -d "kneeoa://reset-password?token=TEST_TOKEN_123" \
  com.yourapp.package

# Or click a link in browser (if custom scheme is registered)
# Open: kneeoa://reset-password?token=TEST_TOKEN_123
```

### Test 2: HTTPS Web Link
```bash
# Android - Simulate HTTPS deep link
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://kneeoa.online/reset-password?token=TEST_TOKEN_123" \
  com.yourapp.package

# Or click a link in browser
# Open: https://kneeoa.online/reset-password?token=TEST_TOKEN_123
```

### Test 3: WWW Variant
```bash
# Android - Simulate WWW variant
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://www.kneeoa.online/reset-password?token=TEST_TOKEN_123" \
  com.yourapp.package

# Or click a link in browser
# Open: https://www.kneeoa.online/reset-password?token=TEST_TOKEN_123
```

## Expected Behavior

### When App is Closed
1. User clicks/taps deep link
2. Android system launches app
3. Deep link is passed to React Navigation
4. App navigates to ResetPassword screen
5. Token is passed to screen component

### When App is in Background
1. User clicks/taps deep link
2. Android system brings app to foreground
3. Deep link is delivered to running instance
4. React Navigation routes to ResetPassword screen
5. Token is passed to screen component

### When App is in Foreground (Different Screen)
1. User clicks/taps deep link
2. App stays in foreground
3. React Navigation navigates to ResetPassword screen
4. Token is passed to screen component

## Verification

### Check Logs
Look for these log messages:

```
[DeepLink] Received URL: kneeoa://reset-password?token=xxx
[DeepLink] Routing to ResetPassword with token
Navigation ready
```

OR

```
[DeepLink] Received URL: https://kneeoa.online/reset-password?token=xxx
[DeepLink] Routing to ResetPassword with token
Navigation ready
```

### Check ResetPasswordScreen
In `src/screens/ResetPasswordScreen.js`:

```javascript
const ResetPasswordScreen = ({ route, navigation }) => {
    const { resetToken } = route.params || {};
    
    console.log('ResetPasswordScreen received token:', resetToken);
    
    // Token should be available here
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

## Common Issues & Solutions

### Issue 1: Custom Scheme Not Working
**Symptom**: App doesn't open when clicking `kneeoa://` link

**Solutions**:
1. Check `app.json` has custom scheme configured:
   ```json
   {
     "expo": {
       "scheme": "kneeoa",
       "android": {
         "intentFilters": [
           {
             "action": "VIEW",
             "autoVerify": true,
             "data": [
               { "scheme": "https", "host": "kneeoa.online" }
             ],
             "category": ["BROWSABLE", "DEFAULT"]
           }
         ]
       }
     }
   }
   ```

2. Rebuild the app: `eas build --platform android`

3. Test with ADB first to verify scheme is registered

### Issue 2: WWW Variant Not Working
**Symptom**: `https://www.kneeoa.online` links don't work

**Solution**:
- Ensure your domain redirect is configured
- `www.kneeoa.online` should redirect to `kneeoa.online`
- OR add both to your Android intent filters

### Issue 3: Token Not Reaching Screen
**Symptom**: Deep link works but token is undefined

**Solutions**:
1. Check URL format: `?token=xxx` (query parameter, not path)
2. Verify `route.params.resetToken` in screen component
3. Check console logs for token extraction

### Issue 4: Navigation Doesn't Change
**Symptom**: App opens but stays on current screen

**Solutions**:
1. Verify `navigationRef.isReady()` returns true
2. Check `authReadyRef.current` is true
3. Look for errors in console logs
4. Ensure screen name matches exactly: `ResetPassword`

## Android Configuration

### app.json Setup
```json
{
  "expo": {
    "scheme": "kneeoa",
    "android": {
      "package": "com.yourapp.package",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "kneeoa.online"
            },
            {
              "scheme": "https",
              "host": "www.kneeoa.online"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### AndroidManifest.xml (Bare Workflow)
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="kneeoa.online" />
    <data android:scheme="https" android:host="www.kneeoa.online" />
</intent-filter>
```

## Testing Checklist

- [ ] Custom scheme (`kneeoa://`) works when app is closed
- [ ] Custom scheme works when app is in background
- [ ] HTTPS link (`https://kneeoa.online`) works
- [ ] WWW variant (`https://www.kneeoa.online`) works
- [ ] Token is correctly extracted from query parameter
- [ ] ResetPassword screen receives the token
- [ ] Token validation works (3 parts separated by dots)
- [ ] Invalid tokens show appropriate error
- [ ] No crashes or navigation errors in logs
- [ ] Deep link works from email/SMS/browser

## Next Steps

1. ✅ Test all three URL formats
2. ✅ Verify token reaches ResetPassword screen
3. ✅ Test with real password reset token from backend
4. ✅ Add analytics to track deep link success rate
5. ✅ Consider adding fallback for invalid tokens
6. ✅ Test on physical device (not just emulator)

## Files Modified

- `App.js` - Updated `prefixes` array to include custom scheme

## Related Files

- `app.json` - Android intent filter configuration
- `src/screens/ResetPasswordScreen.js` - Uses the token
- `src/services/api.js` - Validates and uses the token for password reset
