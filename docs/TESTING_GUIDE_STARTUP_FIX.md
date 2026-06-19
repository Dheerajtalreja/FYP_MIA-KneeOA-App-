# Quick Testing Guide - Startup Crash Fix

## Immediate Testing Steps

### 1. Clean Build
```bash
# Clear cache and rebuild
expo start --clear
# Or for bare workflow
rm -rf node_modules/.cache
npm start
```

### 2. Test Scenarios

#### Scenario A: Fresh Install (No Auth Token)
1. Uninstall app from device/emulator
2. Reinstall fresh
3. **Expected**: Splash → Login screen
4. **Check**: No crash, smooth transitions

#### Scenario B: With Valid Token
1. Login successfully
2. Close app completely (swipe away from recent apps)
3. Reopen app
4. **Expected**: Splash → Home/Questionnaire (based on user state)
5. **Check**: User session restored correctly

#### Scenario C: Network Offline
1. Disable WiFi/mobile data
2. Launch app
3. **Expected**: Splash screen loads, navigates to Login
4. **Check**: No crash, graceful handling

#### Scenario D: Corrupted Storage
1. Clear app data in device settings
2. Launch app
3. **Expected**: Fresh login screen
4. **Check**: No crash on storage access

### 3. Debugging Commands

#### Check Logs (Android)
```bash
adb logcat | grep -E "\[Splash\]|\[AuthContext\]|\[Database\]|\[apiCore\]|\[ErrorBoundary\]"
```

#### Check Logs (Expo Go)
- Open Expo app on device
- Tap to view logs
- Look for error messages

#### Check Navigation State
- Add breakpoint in `AppNavigator` component
- Verify `navigationRef.isReady()` returns true before navigation calls

### 4. Common Issues & Solutions

#### Issue: Still Crashing
**Check**: 
- Look for specific error in logs
- Verify all files were saved correctly
- Check for missing dependencies

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Clear metro cache
expo start --clear
```

#### Issue: Navigation Not Working
**Check**:
- Verify `navigationRef` is properly initialized
- Check `isReady()` returns true

**Solution**:
- Ensure `NavigationContainer` wraps all screens
- Verify `useNavigationContainerRef()` is called correctly

#### Issue: Auth Not Persisting
**Check**:
- Verify SecureStore is working (Android)
- Check localStorage (Web)
- Look for storage permission errors

**Solution**:
- Grant storage permissions on Android
- Check `tokenStore.js` implementation

### 5. Verification Checklist

- [ ] App launches without "Keep stopping" error
- [ ] Splash screen displays for ~3 seconds
- [ ] Navigation transitions are smooth
- [ ] Login screen appears when no token
- [ ] Home screen appears when token exists
- [ ] No console errors during startup
- [ ] Error boundary catches any rendering errors
- [ ] Database initialization doesn't crash
- [ ] Auth state loads safely

### 6. Performance Metrics

Measure these to ensure no regression:

```javascript
// Add to SplashScreen.js useEffect start
const startTime = Date.now();

// Add to navigation transition
console.log(`[Performance] Startup time: ${Date.now() - startTime}ms`);
```

**Target**: < 5000ms total startup time

### 7. Android-Specific Checks

#### Permissions
```xml
<!-- Check AndroidManifest.xml has -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
```

#### SecureStore
- Android uses EncryptedSharedPreferences
- Verify no security exceptions in logs

#### SQLite
- Check database file exists: `/data/data/<package>/databases/kneeoa_local.db`
- Verify no SQL initialization errors

### 8. Emergency Recovery

If app still crashes:

1. **Clear all data**: Settings → Apps → KneeOA → Clear Data
2. **Reinstall**: Uninstall → Reinstall
3. **Check logs**: `adb logcat -d > crash_log.txt`
4. **Test on emulator**: Different Android version
5. **Test on device**: Different hardware

### 9. Success Indicators

✅ **App launches successfully**
✅ **No "Keep stopping" dialog**
✅ **Splash screen displays correctly**
✅ **Navigation transitions work**
✅ **Error boundary shows fallback if needed**
✅ **Logs show graceful error handling**
✅ **No unhandled promise rejections**

## Next Steps After Testing

1. If all tests pass → Deploy to testflight/internal testing
2. Monitor crash reports in production
3. Add Sentry for real-time crash tracking
4. Implement performance monitoring
5. Add automated startup tests
