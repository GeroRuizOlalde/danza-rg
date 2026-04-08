import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv, getSupabaseServiceEnv } from './supabase-env'
import { getUserRole } from './auth-role'
import { SECCIONES_PANEL } from './permisos'

export async function createServerSupabase() {
  const { url, anonKey, isConfigured } = getSupabasePublicEnv()

  if (!isConfigured) return null

  const cookieStore = await cookies()

  return createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components can read cookies but can't always persist them.
        }
      },
    },
  })
}

export function createAdminSupabase() {
  const { url, serviceRoleKey, isConfigured } = getSupabaseServiceEnv()

  if (!isConfigured) return null

  return createClient(url!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function getServerUserRole() {
  const supabase = await createServerSupabase()

  if (!supabase) {
    return { supabase: null, user: null, role: null }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = getUserRole(user)

  return { supabase, user, role }
}

export async function requireAdminUser() {
  const { supabase, user, role } = await getServerUserRole()

  if (!supabase || !user) {
    throw new Error('NecesitÃ¡s iniciar sesiÃ³n para realizar esta acciÃ³n.')
  }

  if (role !== 'admin') {
    throw new Error('No tenÃ©s permisos de administrador para realizar esta acciÃ³n.')
  }

  return { supabase, user }
}

export async function getPermisosSecretaria(): Promise<string[]> {
  const supabaseAdmin = createAdminSupabase()
  if (!supabaseAdmin) return []

  const { data } = await supabaseAdmin
    .from('academia_info')
    .select('permisos_secretaria')
    .limit(1)
    .maybeSingle<{ permisos_secretaria: string[] | null }>()

  return data?.permisos_secretaria ?? ['dashboard', 'turnos', 'clientes']
}

export async function requirePanelAccess(seccion: string) {
  const { supabase, user, role } = await getServerUserRole()

  if (!supabase || !user) {
    throw new Error('NecesitÃ¡s iniciar sesiÃ³n para realizar esta acciÃ³n.')
  }

  if (role === 'admin') return { supabase, user, role }

  if (role === 'secretaria') {
    const seccionDef = SECCIONES_PANEL.find((item) => item.key === seccion)

    if (seccionDef?.soloAdmin) {
      throw new Error('No tenÃ©s permiso para realizar esta acciÃ³n.')
    }

    const permisos = await getPermisosSecretaria()
    if (permisos.includes(seccion)) return { supabase, user, role }
    throw new Error('No tenÃ©s permiso para realizar esta acciÃ³n.')
  }

  throw new Error('No tenÃ©s permisos para realizar esta acciÃ³n.')
}
