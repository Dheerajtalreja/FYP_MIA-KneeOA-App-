/**
 * Unified Backend API Service
 *
 * This module re-exports all functionality from apiCore.js to provide a
 * single consistent interface for the entire application.
 *
 * IMPORTANT: Do not add new local state or duplicate functions here.
 * All core logic and state (like auth tokens) should reside in apiCore.js.
 */

export * from './apiCore';

// For backward compatibility with any files specifically importing from './api'
// instead of the named exports.
import * as apiCore from './apiCore';
export default apiCore;
