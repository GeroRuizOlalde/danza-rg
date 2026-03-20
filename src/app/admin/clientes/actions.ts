'use server'

import { createClient } from '@supabase/supabase-js'

// Usamos la Service Role Key (SOLO EN EL SERVIDOR)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Esta clave no debe estar en el .env.local público
)

export async function invitarAlumnaAction(email: string, nombre: string, apellido: string) {
  try {
    // 1. Invitamos a la alumna (esto manda el mail oficial de Supabase)
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { display_name: nombre, last_name: apellido },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/perfil/completar`
    })

    if (inviteError) throw inviteError

    // 2. Creamos su perfil inicial en la tabla de base de datos
    const { error: dbError } = await supabaseAdmin.from('perfiles').insert([{
      id: data.user.id,
      nombre,
      apellido,
      email,
      estado: 'nueva'
    }])

    if (dbError) throw dbError

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}