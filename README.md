# Knee OA Frontend

Expo React Native mobile frontend for Knee Osteoarthritis analysis and recommendations.

## What it does

- Authenticates users against the FastAPI backend
- Supports sign-up, login error handling, and password recovery guidance
- Collects questionnaire and clinical profile data
- Uploads knee X-ray images and sends them for analysis
- Displays diagnostic results, KL grade, and recommendations
- Caches local data in SQLite for offline-first behavior

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- React Navigation stack navigator
- expo-linear-gradient for the visual design
- expo-sqlite for local persistence

## Project Structure

- `App.js` - app navigator and route registration
- `index.js` - Expo entry point
- `src/screens/` - screen-level UI
- `src/components/` - shared components
- `src/services/` - API, SQLite, and sync logic
- `src/config/` - theme and design tokens

## Key Screens

- `src/screens/SplashScreen.js` - startup animation and route handoff
- `src/screens/LoginScreen.js` - login form and JWT token retrieval
- `src/screens/RegisterScreen.js` - account creation flow with the app theme
- `src/screens/ForgotPasswordScreen.js` - recovery guidance screen for forgotten passwords
- `src/screens/ErrorScreen.js` - themed error fallback screen for auth and other failures
- `src/screens/QuestionnaireScreen.js` - clinical intake and profile update
- `src/screens/HomeScreen.js` - dashboard and navigation hub
- `src/screens/ImageCaptureScreen.js` - X-ray upload and analysis flow
- `src/screens/ResultScreen.js` - diagnostic result display
- `src/screens/RecommendationsScreen.js` - recommendations and exercise videos

## Shared UI

- `src/components/ProgressBar.js`
- `src/components/DisclaimerBanner.js`

## Services

- `src/services/api.js` - backend requests and auth token handling
- `src/services/database.js` - local SQLite storage
- `src/services/sync.js` - sync orchestration

## Backend Configuration

The backend URL is configured through `.env.local`:

- `EXPO_PUBLIC_BACKEND_URL=http://localhost:8000`

`src/services/api.js` reads this variable and uses the FastAPI routes defined in `openapi.json`.

## Backend Flow

The frontend currently follows this flow:

1. Sign up or log in with email and password
2. Use the forgot-password screen for recovery guidance when credentials are lost
3. Save or update profile fields from the questionnaire
4. Upload an X-ray image to the backend
5. Analyze the uploaded image by `image_id`
6. Render the report details
7. Fetch recommendations and exercise videos by KL grade

Password recovery currently routes to a themed guidance screen because the backend does not expose a dedicated reset-password endpoint yet.

## Available Scripts

```bash
npm install
npm start
npm run android
npm run ios
npm run web
```

## Local Notes

- The image picker is still a mock UI and should be replaced with a real camera/gallery picker when needed.
- The app is designed to keep working offline by storing key records in SQLite.
- If backend requests fail, some screens fall back to cached or placeholder content.

## Related Docs

- [FRONTEND_CONTEXT.md](FRONTEND_CONTEXT.md)
- [BACKEND_CONTEXT.md](BACKEND_CONTEXT.md)
- [openapi.json](openapi.json)
