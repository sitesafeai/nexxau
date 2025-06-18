/**
 * Response type for signup endpoint
 */
export type SignupResponse = { message: string; error?: string } | { error: string; details?: any }; 