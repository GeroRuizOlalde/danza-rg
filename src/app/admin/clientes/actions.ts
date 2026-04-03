'use server'

import { missingSupabaseServiceEnvMessage } from '@/lib/supabase-env'
import { createAdminSupabase, requireAdminUser } from '@/lib/supabase-server'

type ActionResult =
  | { success: true }
  | { success: false; error: string }

type AlumnaInput = {
  id: string
  nombre: string
  apellido: string
  telefono: string
  email: string
  fechaNacimiento: string
  estado: string
  fechaInicio: string
}

const ESTADOS_ALUMNA_VALIDOS = new Set(['nueva', 'activa', 'baja'])
const CAMPOS_CHECKLIST = new Set(['apto_medico', 'fotocopia_dni'])

function parseError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function normalizarString(value: string | null | undefined) {
  return value?.trim() ?? ''
}

async function getAdminClient() {
  const supabaseAdmin = createAdminSupabase()

  if (!supabaseAdmin) {
    throw new Error(missingSupabaseServiceEnvMessage)
  }

  await requireAdminUser()

  return supabaseAdmin
}

export async function invitarAlumnaAction(email: string, nombre: string, apellido: string) {
  try {
    const supabaseAdmin = await getAdminClient()

    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { display_name: nombre, last_name: apellido },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/perfil/completar`,
    })

    if (inviteError) {
      return { success: false, error: inviteError.message }
    }

    if (!data?.user?.id) {
      return { success: false, error: 'No se pudo crear el usuario.' }
    }

    const { error: dbError } = await supabaseAdmin.from('perfiles').insert([{
      id: data.user.id,
      nombre,
      apellido,
      email,
      estado: 'nueva'
    }])

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al invitar alumna.',
    }
  }
}

export async function eliminarAlumnaAction(alumnaId: string) {
  try {
    const supabaseAdmin = await getAdminClient()

    // Borrar perfil (cascadea a alumna_clases)
    const { error: dbError } = await supabaseAdmin
      .from('perfiles')
      .delete()
      .eq('id', alumnaId)

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    // Intentar borrar de auth (puede no existir si se creó manual)
    await supabaseAdmin.auth.admin.deleteUser(alumnaId).catch(() => {})

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al eliminar alumna.',
    }
  }
}

export async function cambiarEmailAction(alumnaId: string, nuevoEmail: string) {
  try {
    const supabaseAdmin = await getAdminClient()

    // Actualizar email en auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(alumnaId, {
      email: nuevoEmail,
      email_confirm: true,
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    // Actualizar email en perfiles
    const { error: dbError } = await supabaseAdmin
      .from('perfiles')
      .update({ email: nuevoEmail })
      .eq('id', alumnaId)

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al cambiar email.',
    }
  }
}

export async function actualizarAlumnaAction(input: AlumnaInput): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdminClient()
    const nombre = normalizarString(input.nombre)
    const apellido = normalizarString(input.apellido)
    const telefono = normalizarString(input.telefono)
    const email = normalizarString(input.email)
    const estado = ESTADOS_ALUMNA_VALIDOS.has(input.estado) ? input.estado : 'nueva'

    if (!input.id || !nombre || !apellido) {
      return { success: false, error: 'Completá nombre y apellido para guardar la alumna.' }
    }

    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(input.id, {
        email,
        email_confirm: true,
      })

      if (authError && !authError.message.toLowerCase().includes('user not found')) {
        return { success: false, error: authError.message }
      }
    }

    const { error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .update({
        nombre,
        apellido,
        telefono,
        email: email || null,
        fecha_nacimiento: normalizarString(input.fechaNacimiento) || null,
        estado,
      })
      .eq('id', input.id)

    if (perfilError) {
      return { success: false, error: perfilError.message }
    }

    const fechaInicio = normalizarString(input.fechaInicio)

    if (fechaInicio) {
      const { data: inscripcion, error: inscripcionError } = await supabaseAdmin
        .from('alumna_clases')
        .select('id')
        .eq('alumna_id', input.id)
        .order('fecha_inicio', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (inscripcionError) {
        return { success: false, error: inscripcionError.message }
      }

      if (inscripcion?.id) {
        const { error: updateInscripcionError } = await supabaseAdmin
          .from('alumna_clases')
          .update({ fecha_inicio: fechaInicio })
          .eq('id', inscripcion.id)

        if (updateInscripcionError) {
          return { success: false, error: updateInscripcionError.message }
        }
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos actualizar la alumna.'),
    }
  }
}

export async function actualizarChecklistAlumnaAction(
  alumnaId: string,
  campo: string,
  valor: boolean
): Promise<ActionResult> {
  try {
    if (!alumnaId || !CAMPOS_CHECKLIST.has(campo)) {
      return { success: false, error: 'El dato que querés actualizar no es válido.' }
    }

    const supabaseAdmin = await getAdminClient()
    const { error } = await supabaseAdmin
      .from('perfiles')
      .update({ [campo]: valor })
      .eq('id', alumnaId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos actualizar la documentación de la alumna.'),
    }
  }
}
