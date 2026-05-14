export const ADMIN_EMAIL = 'gesielsantana89@gmail.com'

export function isAdmin(email: string | undefined) {
  return email === ADMIN_EMAIL
}
