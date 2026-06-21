import { registerRootComponent } from 'expo';

import App from './App';

// Global error handler to catch any unhandled promise rejections or runtime errors
// This prevents the app from crashing with "Keep stopping" errors
if (typeof global !== 'undefined') {
    // Catch unhandled promise rejections
    process?.on?.('unhandledRejection', (reason, promise) => {
        console.error('[Global] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Catch uncaught JS errors
    process?.on?.('uncaughtException', (error) => {
        console.error('[Global] Uncaught Exception:', error);
    });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
