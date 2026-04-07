// Secciones del panel admin y sus rutas
export type SeccionAdmin = {
  key: string
  nombre: string
  path: string
  soloAdmin?: boolean // si true, solo admin puede acceder, no configurable
}

export const SECCIONES_PANEL: SeccionAdmin[] = [
  { key: 'dashboard', nombre: 'Dashboard', path: '/admin/dashboard' },
  { key: 'turnos', nombre: 'Turnos', path: '/admin/turnos' },
  { key: 'mensajes', nombre: 'Mensajes del formulario', path: '/admin/mensajes' },
  { key: 'clientes', nombre: 'Alumnas', path: '/admin/clientes' },
  { key: 'pagos', nombre: 'Pagos', path: '/admin/pagos' },
  { key: 'galeria', nombre: 'Galería', path: '/admin/galeria' },
  { key: 'profesores', nombre: 'Profesores', path: '/admin/profesores' },
  { key: 'horarios', nombre: 'Horarios', path: '/admin/horarios' },
  { key: 'clases', nombre: 'Clases', path: '/admin/clases' },
  { key: 'configuracion', nombre: 'Configuración', path: '/admin/configuracion', soloAdmin: true },
  { key: 'equipo', nombre: 'Equipo', path: '/admin/equipo', soloAdmin: true },
]

export const PERMISOS_DEFAULT_SECRETARIA = ['dashboard', 'turnos', 'clientes']

export function seccionDesdePath(pathname: string): string | null {
  const match = SECCIONES_PANEL.find(
    (s) => pathname === s.path || pathname.startsWith(s.path + '/')
  )
  return match?.key ?? null
}

export function tieneAcceso(
  role: string | null,
  seccion: string,
  permisosSecretaria: string[]
): boolean {
  if (role === 'admin') return true
  if (role === 'secretaria') {
    const def = SECCIONES_PANEL.find((s) => s.key === seccion)
    if (def?.soloAdmin) return false
    return permisosSecretaria.includes(seccion)
  }
  return false
}
