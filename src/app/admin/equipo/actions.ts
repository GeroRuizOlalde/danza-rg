'use server'

import { missingSupabaseServiceEnvMessage } from '@/lib/supabase-env'
import { createAdminSupabase, requireAdminUser } from '@/lib/supabase-server'

export async function getPermisosSecretariaAction(): Promise<
  { success: true; data: string[] } | { success: false; error: string }
> {
  try {
    const supabaseAdmin = createAdminSupabase()
    if (!supabaseAdmin) throw new Error(missingSupabaseServiceEnvMessage)
    await requireAdminUser()

    const { data, error } = await supabaseAdmin
      .from('academia_info')
      .select('permisos_secretaria')
      .limit(1)
      .maybeSingle<{ permisos_secretaria: string[] | null }>()

    if (error) throw error
    return {
      success: true,
      data: data?.permisos_secretaria ?? ['dashboard', 'turnos', 'clientes'],
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cargar permisos.',
    }
  }
}

export async function actualizarPermisosSecretariaAction(
  permisos: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabaseAdmin = createAdminSupabase()
    if (!supabaseAdmin) throw new Error(missingSupabaseServiceEnvMessage)
    await requireAdminUser()

    const { data: infoRow, error: fetchError } = await supabaseAdmin
      .from('academia_info')
      .select('id')
      .limit(1)
      .maybeSingle<{ id: string }>()

    if (fetchError) throw fetchError
    if (!infoRow?.id) throw new Error('No se encontrÃ³ la configuraciÃ³n de la academia.')

    const { error } = await supabaseAdmin
      .from('academia_info')
      .update({ permisos_secretaria: permisos })
      .eq('id', infoRow.id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al guardar permisos.',
    }
  }
}

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

type UsuarioSistema = {
  id: string
  email: string
  role: 'admin' | 'secretaria'
  displayName: string
  createdAt: string
}

const ROLES_VALIDOS = new Set(['admin', 'secretaria'])

function parseError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function getAdminContext() {
  const supabaseAdmin = createAdminSupabase()

  if (!supabaseAdmin) {
    throw new Error(missingSupabaseServiceEnvMessage)
  }

  await requireAdminUser()

  return supabaseAdmin
}

export async function listarUsuariosSistemaAction(): Promise<ActionResult<UsuarioSistema[]>> {
  try {
    const supabaseAdmin = await getAdminContext()

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 200,
    })

    if (error) {
      throw error
    }

    const usuarios: UsuarioSistema[] = (data?.users ?? [])
      .filter((u) => {
        const role = u.app_metadata?.role
        return role === 'admin' || role === 'secretaria'
      })
      .map((u) => ({
        id: u.id,
        email: u.email ?? '',
        role: u.app_metadata.role as 'admin' | 'secretaria',
        displayName: u.user_metadata?.display_name ?? u.email?.split('@')[0] ?? '',
        createdAt: u.created_at,
      }))

    return { success: true, data: usuarios }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos cargar los usuarios del sistema.'),
    }
  }
}

export async function invitarUsuarioSistemaAction(
  email: string,
  role: string,
  displayName: string
): Promise<ActionResult> {
  try {
    const emailNorm = email.trim().toLowerCase()
    const nombre = displayName.trim()

    if (!emailNorm || !ROLES_VALIDOS.has(role)) {
      return { success: false, error: 'Email o rol invÃ¡lido.' }
    }

    const supabaseAdmin = await getAdminContext()

    const { data: invitedUser, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      emailNorm,
      {
        data: {
          display_name: nombre || emailNorm.split('@')[0],
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/activar`,
      }
    )

    if (error) {
      throw error
    }

    const invitedUserId = invitedUser?.user?.id

    if (!invitedUserId) {
      throw new Error('No pudimos obtener el usuario invitado para asignarle el rol.')
    }

    const { error: roleError } = await supabaseAdmin.auth.admin.updateUserById(
      invitedUserId,
      {
        app_metadata: { role },
      }
    )

    if (roleError) throw roleError

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos invitar al usuario.'),
    }
  }
}

export async function cambiarRolUsuarioAction(
  userId: string,
  nuevoRol: string
): Promise<ActionResult> {
  try {
    if (!userId || !ROLES_VALIDOS.has(nuevoRol)) {
      return { success: false, error: 'Usuario o rol invÃ¡lido.' }
    }

    const supabaseAdmin = await getAdminContext()

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { role: nuevoRol },
    })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos cambiar el rol.'),
    }
  }
}

export async function eliminarUsuarioSistemaAction(userId: string): Promise<ActionResult> {
  try {
    if (!userId) {
      return { success: false, error: 'Usuario invÃ¡lido.' }
    }

    const supabaseAdmin = await getAdminContext()

    const { user: currentUser } = await requireAdminUser()

    if (currentUser.id === userId) {
      return { success: false, error: 'No podÃ©s eliminar tu propio usuario.' }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos eliminar el usuario.'),
    }
  }
}
