# Password Reset Deep Link Implementation

## Overview
This implementation adds a secure "Set New Password" flow that intercepts deep links from password reset emails and communicates with your FastAPI backend.

## Files Modified/Created

### 1. **New Package Installed**
- `expo-linking` - For deep link handling

### 2. **New Files Created**

#### `src/screens/ResetPasswordScreen.js`
- **Purpose**: The UI screen for setting a new password
- **Features**:
  - Two secure password inputs (New Password & Confirm Password)
  - Password visibility toggle (eye icon)
  - Form validation (match check, minimum 8 characters)
  - Loading state during API call
  - Success/Error alerts
  - Cancel button with confirmation dialog
  - Matches existing app theme (COLORS, SHADOWS, SIZES)
  - Animated entrance (fade + slide)

#### `src/services/resetTokenStore.js`
- **Purpose**: Secure storage for the reset token
- **Functions**:
  - `storeResetToken(token)` - Store token in SecureStore
  - `getResetToken()` - Retrieve stored token
  - `clearResetToken()` - Remove token from storage

### 3. **Modified Files**

#### `App.js`
**Changes**:
- Added `expo-linking` import for deep link handling
- Added `ResetPasswordScreen` import
- Created `NavigationHandler` component that:
  - Listens for deep links using `Linking.getInitialURL()` (cold start)
  - Uses `Linking.addEventListener('url')` for hot starts
  - Parses URL to extract `reset-password` path and `token` query param
  - Navigates to ResetPassword screen with token
- Added deep link configuration to `NavigationContainer`:
  ```javascript
  linking={{
    prefixes: ['https://kneeoa.online/'],
    config: {
      screens: {
        ResetPassword: 'reset-password',
      },
    },
  }}
  ```
- Added `ResetPassword` route to Stack.Navigator

#### `src/services/api.js`
**Added Function**:
```javascript
export const resetPassword = async (token, newPassword) => {
  // POST to https://kneeoa.online/reset-password
  // Body: { token: "<token>", new_password: "<password>" }
}
```

## Deep Link Flow

### URL Format
```
https://kneeoa.online/reset-password?token=<JWT_TOKEN>
```

### Flow Steps
1. **User clicks email link** → App opens (cold start) or comes to foreground (hot start)
2. **Deep link intercepted** → `NavigationHandler` component parses URL
3. **Token extracted** → Passed as `resetToken` param to ResetPasswordScreen
4. **Screen validates** → Shows error if token missing/invalid
5. **User enters password** → Validates match and minimum length
6. **API call made** → POST to `/reset-password` with token and new password
7. **Success** → Alert shown, navigates back to Login screen
8. **Error** → Alert shows error message from backend

## API Endpoint Details

**Endpoint**: `POST https://kneeoa.online/reset-password`

**Request Body**:
```json
{
  "token": "<JWT_TOKEN_FROM_DEEP_LINK>",
  "new_password": "<USER_INPUT_PASSWORD>"
}
```

**Success Response (200 OK)**:
- Shows success alert
- Clears token
- Navigates to Login screen

**Error Response (400/404)**:
- Shows error message from `response.data.detail` or similar

## Testing

### Manual Testing
1. **Cold Start**: Close app completely, click deep link
2. **Hot Start**: Open app, then click deep link while app is running
3. **Invalid Token**: Use malformed or expired token in URL
4. **Missing Token**: Use URL without `?token=` parameter

### Expected Behaviors
- ✅ App navigates to ResetPassword screen when valid link clicked
- ✅ Error alert shown if token missing/invalid
- ✅ Form validation prevents submission with mismatched passwords
- ✅ Loading state shown during API call
- ✅ Success alert + navigation to Login on HTTP 200
- ✅ Error alert with backend message on HTTP 400/404

## Security Notes
- Token is stored in `expo-secure-store` (encrypted storage)
- Password inputs use `secureTextEntry` for masking
- Token is only used once (cleared after successful reset)
- Minimum 8-character password requirement enforced

## Next Steps (Optional Enhancements)
1. Add token expiration check before showing screen
2. Implement password strength indicator
3. Add "Resend Reset Link" functionality
4. Store reset attempt logging for audit trail
