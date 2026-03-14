/**
 * Validate E.164 phone number format.
 */
export function validateE164Phone(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

/**
 * Validate email address format.
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
