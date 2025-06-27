# Fix Strategy for Foreign Key Constraint Error

## Root Cause
The `/api/users/invite` endpoint fails with a foreign key constraint violation because:
1. A user session exists (NextAuth session is valid)
2. But the user referenced by `session.user.email` doesn't exist in the database
3. The code tries to use `currentUser.id` as `invitedBy`, but this ID doesn't exist

## The Fix
We need to add proper error handling and validation:

1. **Better Error Handling**: Check if `currentUser` exists before using its ID
2. **User Creation**: Ensure the user exists in the database when they have a valid session
3. **Graceful Degradation**: Handle the case where session exists but user doesn't
4. **Detailed Error Messages**: Provide better error information for debugging

## Implementation
1. Add null checks for `currentUser`
2. Add try-catch around the database operations
3. Provide meaningful error messages
4. Consider auto-creating the user if session is valid but user doesn't exist

