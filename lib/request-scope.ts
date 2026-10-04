// 📡 Ignorer les réponses arrivées après navigation ou changement de compte.
export function createRequestScope() {
  let active = true
  return { current: () => active, cancel: () => { active = false } }
}
