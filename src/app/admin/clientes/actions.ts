'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function invitarAlumnaAction(email: string, nombre: string, apellido: string) {
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Faltan variables de entorno del servidor (SUPABASE_SERVICE_ROLE_KEY).' }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { display_name: nombre, last_name: apellido },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/perfil/completar`
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
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error desconocido al invitar alumna.' }
  }
}

export async function eliminarAlumnaAction(alumnaId: string) {
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Faltan variables de entorno del servidor.' }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
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
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error desconocido al eliminar alumna.' }
  }
}

export async function cambiarEmailAction(alumnaId: string, nuevoEmail: string) {
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Faltan variables de entorno del servidor.' }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
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
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error desconocido al cambiar email.' }
  }
}
