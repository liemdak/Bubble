import { redirect } from 'next/navigation'

/**
 * Bubble uses wallet-based auth (no email/password).
 * Redirect register → login which handles wallet connect.
 */
export default function RegisterPage() {
  redirect('/login')
}
