export type PanelRole = 'admin' | 'secretaria'

export function getUserRole(
  user:
    | {
        app_metadata?: Record<string, unknown> | null
      }
    | null
    | undefined
): PanelRole | null {
  const role = user?.app_metadata?.role
  return role === 'admin' || role === 'secretaria' ? role : null
}
