# @nexxau/errors

Shared error handling for Nexxau microservices.

## Usage

```typescript
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  ErrorHandler,
} from '@nexxau/errors';

// Throw specific errors
if (!email) {
  throw new ValidationError('Email is required', { field: 'email' });
}

if (!user) {
  throw new NotFoundError('User', userId);
}

// Handle errors in API routes
try {
  // ... logic
} catch (error) {
  if (error instanceof NotFoundError) {
    return res.status(404).json(ErrorHandler.toResponse(error));
  }
  throw error;
}
```

## Error Classes

- `ValidationError` (400) - Input validation failures
- `AuthenticationError` (401) - Authentication required
- `AuthorizationError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `RateLimitError` (429) - Rate limit exceeded
- `InternalServerError` (500) - Internal errors
- `ServiceUnavailableError` (503) - External service unavailable
