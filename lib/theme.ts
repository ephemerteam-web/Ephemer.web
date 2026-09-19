export type ThemeChoice = 'dark' | 'light' | 'system'
export function validTheme(value: string | null): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system'
}
export function resolvedTheme(choice: ThemeChoice, systemDark: boolean): 'dark' | 'light' {
  return choice === 'system' ? (systemDark ? 'dark' : 'light') : choice
}
