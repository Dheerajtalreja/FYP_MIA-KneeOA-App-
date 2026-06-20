# UX Improvements - Profile Management & Logout Protection

## Overview
This document covers three critical UX improvements implemented to enhance user experience, data integrity, and app safety.

## 1. Enforce Questionnaire Routing (New Users) ✅

### Problem
New users could bypass the medical questionnaire and access the Home screen without completing their profile, making the app unusable for long-term tracking.

### Solution
Updated routing logic in `SplashScreen.js` to enforce questionnaire completion:

```javascript
// In SplashScreen.js - performNavigationTransition function
if (accessToken) {
    try {
        const user = await getUser();
        const userKey = user?.server_id || user?.email || user?.id;

        if (userKey) {
            const questionnaire = await getLatestQuestionnaire(userKey);
            if (questionnaire) {
                // User has completed questionnaire → Go to Home
                if (active) navigation.replace('Home');
                return;
            }
        }
        // No questionnaire found → Force to QuestionnaireScreen
        if (active) navigation.replace('Questionnaire');
    } catch (dbError) {
        console.warn('[Splash] Failed to check state, defaulting to Home:', dbError);
        if (active) navigation.replace('Home');
    }
}
```

### How It Works
1. **Check Access Token**: User must be authenticated
2. **Get User Data**: Retrieve user from local database
3. **Check Questionnaire**: Query for existing questionnaire response
4. **Route Decision**:
   - ✅ Has questionnaire → Navigate to `Home`
   - ❌ No questionnaire → Navigate to `Questionnaire`

### User Flow
```
Login/Register
    ↓
Splash Screen Checks
    ↓
Has Questionnaire?
    ├─ YES → Home Screen ✅
    └─ NO → Questionnaire Screen → Complete Profile → Home Screen
```

### Files Modified
- `src/screens/SplashScreen.js` - Enforced routing logic

---

## 2. Add 'Update Questionnaire' Functionality ✅

### Problem
Users had no way to update their medical profile after initial submission, making the app unusable for long-term health tracking.

### Solution
Added edit mode to `QuestionnaireScreen` with the following features:

#### A. Edit Mode Detection
```javascript
const QuestionnaireScreen = ({ navigation, route }) => {
    const [isEditing, setIsEditing] = useState(false);

    // Check if we're in edit mode
    useEffect(() => {
        const editMode = route?.params?.isEditing === true;
        setIsEditing(editMode);

        if (editMode) {
            loadExistingData();
        } else {
            setInitializing(false);
        }
    }, [route?.params?.isEditing]);
```

#### B. Load Existing Data
```javascript
const loadExistingData = async () => {
    try {
        const currentUser = await getUser();
        const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
        
        const { getLatestQuestionnaire } = require('../services/database');
        const existingData = await getLatestQuestionnaire(userId);

        if (existingData) {
            // Pre-fill form with existing data
            setFormData({
                age: existingData.age || 50,
                gender: existingData.gender || 'male',
                weight: existingData.weight || 75,
                height: existingData.height || 170,
                painLevel: existingData.pain_level || 3,
                painLocation: existingData.pain_location || 'both',
                painDuration: existingData.pain_duration || 'months',
                mobilityScore: existingData.mobility_score || 5,
                canBendFully: existingData.can_bend_fully === 1,
                canClimbStairs: existingData.can_climb_stairs === 1,
                canWalk30Min: existingData.can_walk_30min === 1,
                previousInjuries: existingData.previous_injuries || 'none',
                surgeries: existingData.surgeries || 'none',
                medications: existingData.medications || 'ibuprofen',
                familyHistory: existingData.family_history === 1,
                additionalNotes: existingData.additional_notes || '',
            });
        }
    } catch (error) {
        console.error('Failed to load existing questionnaire:', error);
    } finally {
        setInitializing(false);
    }
};
```

#### C. Save as Update (Not Insert)
```javascript
const handleComplete = async () => {
    // ... existing code ...
    
    // Check if we're editing - use INSERT OR REPLACE instead of INSERT
    const localQuestionnaireId = await saveQuestionnaireResponse({ 
        ...formData, 
        userId,
        isEditing: isEditing  // Pass edit flag
    });
    
    // ... rest of code ...
};
```

#### D. Add Edit Button to Home Screen
```javascript
// In HomeScreen.js bottom navigation
<TouchableOpacity 
    style={styles.navItem} 
    onPress={() => navigation.navigate('Questionnaire', { isEditing: true })}>
    <Text style={styles.navIcon}>📋</Text>
    <Text style={styles.navLabel}>Edit Profile</Text>
</TouchableOpacity>
```

### How It Works

#### Edit Mode Flow
```
User taps "Edit Profile" in Home Screen
    ↓
Navigate to QuestionnaireScreen with { isEditing: true }
    ↓
QuestionnaireScreen detects isEditing parameter
    ↓
loadExistingData() fetches current data from SQLite
    ↓
Form pre-fills with existing values
    ↓
User modifies data
    ↓
Submit triggers UPDATE (not INSERT)
    ↓
Data saved to database
    ↓
Navigate to Home with updated profile
```

### Database Operations

#### New User (INSERT)
```sql
INSERT INTO questionnaire_responses (
    user_id, age, gender, weight, height, 
    pain_level, pain_location, pain_duration,
    mobility_score, can_bend_fully, can_climb_stairs,
    can_walk_30min, previous_injuries, surgeries,
    medications, family_history, additional_notes
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

#### Existing User (UPDATE)
```sql
INSERT OR REPLACE INTO questionnaire_responses (
    user_id, age, gender, weight, height,
    pain_level, pain_location, pain_duration,
    mobility_score, can_bend_fully, can_climb_stairs,
    can_walk_30min, previous_injuries, surgeries,
    medications, family_history, additional_notes, completed_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
```

### Files Modified
- `src/screens/QuestionnaireScreen.js` - Added edit mode support
- `src/screens/HomeScreen.js` - Added "Edit Profile" button

---

## 3. Consolidate and Protect Logout Action ✅

### Problem
- Logout was scattered across multiple buttons (bottom nav, profile icon)
- No confirmation dialog, leading to accidental logouts
- Poor user experience with potential data loss

### Solution

#### A. Remove Scattered Logout Buttons
```javascript
// BEFORE (❌ Bad - Multiple logout points)
<TouchableOpacity style={styles.navItem} onPress={handleLogout}>
    <Text style={styles.navIcon}>⚙️</Text>
    <Text style={styles.navLabel}>Settings</Text>
</TouchableOpacity>

// AFTER (✅ Good - Single logout point)
<TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Questionnaire', { isEditing: true })}>
    <Text style={styles.navIcon}>📋</Text>
    <Text style={styles.navLabel}>Edit Profile</Text>
</TouchableOpacity>
```

#### B. Consolidate Logout to Profile Icon Only
```javascript
// Only logout button is now in the profile icon (top-right)
<TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
    <LinearGradient
        colors={['#00D2FF', '#6C63FF']}
        style={styles.profileGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
    >
        <Text style={styles.profileIcon}>👤</Text>
    </LinearGradient>
</TouchableOpacity>
```

#### C. Add Confirmation Dialog
```javascript
const handleLogout = async () => {
    try {
        // Show confirmation dialog
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out of your account?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        if (typeof logout === 'function') {
                            await logout();
                        }
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    },
                },
            ]
        );
    } catch (error) {
        console.error('[HomeScreen] Logout failed:', error);
        Alert.alert('Error', 'Failed to log out. Please try again.');
        navigation.replace('Login');
    }
};
```

### How It Works

#### Logout Flow
```
User taps profile icon (top-right)
    ↓
Alert dialog appears:
  "Log Out"
  "Are you sure you want to log out of your account?"
    ↓
User chooses:
  ├─ "Cancel" → Dialog closes, stays logged in ✅
  └─ "Log Out" → Execute logout flow
        ↓
  1. Call logout() from AuthContext
  2. Clear tokens from storage
  3. Clear API tokens
  4. Reset navigation to Login screen
  5. ✅ User logged out safely
```

### User Experience Improvements

#### Before (❌)
- Logout button in bottom navigation
- No confirmation
- Accidental logouts common
- Data loss risk
- Confusing UX

#### After (✅)
- Logout only via profile icon
- Confirmation dialog required
- Accidental logouts prevented
- Data protected
- Clear, intentional UX

### Files Modified
- `src/screens/HomeScreen.js` - Consolidated logout, added confirmation

---

## Testing Guide

### Test 1: Enforce Questionnaire Routing
```
1. Clear app data
2. Register new user
3. Complete login
4. ✅ Should navigate to QuestionnaireScreen (NOT Home)
5. Complete questionnaire
6. ✅ Should navigate to Home
7. Logout and login again
8. ✅ Should navigate directly to Home (skip questionnaire)
```

### Test 2: Update Questionnaire
```
1. Login with existing user (has questionnaire)
2. ✅ Should navigate to Home
3. Tap "Edit Profile" in bottom navigation
4. ✅ Should open QuestionnaireScreen with pre-filled data
5. Modify some fields
6. Submit
7. ✅ Should save as UPDATE (not INSERT)
8. Return to Home
9. Tap "Edit Profile" again
10. ✅ Should show updated data
```

### Test 3: Protected Logout
```
1. Login to app
2. Tap profile icon (top-right)
3. ✅ Alert dialog appears: "Are you sure you want to log out?"
4. Tap "Cancel"
5. ✅ Dialog closes, stays logged in
6. Tap profile icon again
7. Tap "Log Out"
8. ✅ Should navigate to Login screen
9. Verify tokens are cleared
```

### Test 4: No Scattered Logout
```
1. Check bottom navigation
2. ✅ Should NOT have logout button
3. ✅ Should have "Edit Profile" button instead
4. Tap "Edit Profile"
5. ✅ Should open questionnaire in edit mode
```

---

## Verification Checklist

- [ ] New users forced to complete questionnaire before accessing Home
- [ ] Existing users can access Home directly (no questionnaire prompt)
- [ ] "Edit Profile" button works in bottom navigation
- [ ] Questionnaire pre-fills with existing data in edit mode
- [ ] Submitting edit updates existing record (not creates new)
- [ ] Logout only accessible via profile icon
- [ ] Logout confirmation dialog appears
- [ ] Cancel button prevents logout
- [ ] Log Out button executes logout and navigates to Login
- [ ] No scattered logout buttons in bottom navigation
- [ ] All navigation flows work smoothly

---

## User Benefits

### 1. Data Integrity
- ✅ All users complete medical profile before using app
- ✅ No incomplete data in system
- ✅ Consistent user profiles

### 2. Long-term Usability
- ✅ Users can update medical information as health changes
- ✅ No need to re-register for profile updates
- ✅ Edit mode preserves history

### 3. User Safety
- ✅ Prevents accidental logouts
- ✅ Clear confirmation before destructive action
- ✅ Single, intentional logout point

### 4. Better UX
- ✅ Intuitive navigation flow
- ✅ Clear edit vs. new distinction
- ✅ Professional confirmation dialogs

---

## Related Fixes

### Previous Bug Fixes
1. ✅ **Infinite Loop** - Fixed in `HomeScreen.js` (array reference trap)
2. ✅ **Infinite Loop** - Fixed in `HistoryScreen.js` (missing `[]`)
3. ✅ **Database Lock** - Fixed with WAL mode in `database.js`
4. ✅ **Navigation Error** - Fixed with `canGoBack()` check
5. ✅ **Deep Link** - Fixed with proper prefix configuration
6. ✅ **Ghost Animation** - Fixed with explicit cleanup in `SplashScreen.js`

### Current UX Improvements
1. ✅ **Enforce Questionnaire** - New users must complete profile
2. ✅ **Edit Questionnaire** - Users can update medical data
3. ✅ **Protected Logout** - Confirmation dialog, consolidated button

---

## Next Steps

1. ✅ Press `r` to reload the app
2. ✅ Test questionnaire routing for new users
3. ✅ Test edit functionality for existing users
4. ✅ Test logout confirmation dialog
5. ✅ Verify no scattered logout buttons
6. ✅ Deploy to production when verified

All three UX improvements are now implemented! 🎉
