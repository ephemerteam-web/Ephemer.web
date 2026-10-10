// Une destination de connexion est un chemin connu, jamais une URL reçue librement.
export function authReturn(value: unknown): '/etoile' | '/dashboard' | '/reset-password' {
  return value === '/etoile' || value === '/reset-password' ? value : '/dashboard'
}
export function authPage(path: '/connexion' | '/inscription' | '/completer-profil', next: unknown) {
  const target = authReturn(next)
  return path + (target === '/dashboard' ? '' : '?' + new URLSearchParams({ next: target }))
}
export function browserAuthReturn() { return typeof window === 'undefined' ? '/dashboard' : authReturn(new URLSearchParams(window.location.search).get('next')) }
export function profileDestination(complete: boolean, next: unknown) {
  const target = authReturn(next)
  return target === '/reset-password' || complete ? target : authPage('/completer-profil', target)
}
