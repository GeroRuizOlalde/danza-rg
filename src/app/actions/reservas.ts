'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isDiaAbierto, sanitizeDiasAbiertos } from '@/lib/academia'
import { missingSupabaseServiceEnvMessage } from '@/lib/supabase-env'
import {
  HORARIO_A_COORDINAR,
  getDiaSemana,
  getTodayInArgentina,
  normalizarTelefono,
  normalizarTexto,
} from '@/lib/reservas'
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server'

type ReservationActionResult = {
  success: boolean
  error?: string
}

type LandingReservationInput = {
  nombre: string
  apellido?: string
  telefono: string
  disciplina?: string
}

type TurneroReservationInput = {
  nombre: string
  apellido?: string
  telefono: string
  email?: string
  disciplina: string
  fecha?: string | null
  horario?: string
  alumnoNombre: string
  alumnoEdad?: number | null
}

type CrearReservaRpcInput = {
  nombre: string
  apellido?: string
  telefono: string
  email?: string
  disciplina: string
  fecha: string | null
  horario: string
  alumnoNombre?: string
  alumnoEdad?: number | null
  origen: 'landing' | 'turnero' | 'admin'
  perfilId?: string | null
  dia?: string | null
  validarHorario: boolean
  estado?: string
}

async function obtenerDiasAbiertosAcademia(supabaseAdmin: SupabaseClient) {
  const { data, error } = await supabaseAdmin
    .from('academia_info')
    .select('dias_abiertos')
    .limit(1)
    .maybeSingle<{ dias_abiertos?: string[] | null }>()

  if (error) {
    throw error
  }

  return sanitizeDiasAbiertos(data?.dias_abiertos)
}

async function crearReservaAtomica(input: CrearReservaRpcInput): Promise<ReservationActionResult> {
  const supabaseAdmin = createAdminSupabase()

  if (!supabaseAdmin) {
    return { success: false, error: missingSupabaseServiceEnvMessage }
  }

  const { error } = await supabaseAdmin.rpc('crear_reserva_segura', {
    p_nombre: input.nombre,
    p_apellido: input.apellido || null,
    p_telefono: input.telefono || null,
    p_email: input.email || null,
    p_disciplina: input.disciplina,
    p_fecha: input.fecha,
    p_horario: input.horario,
    p_alumno_nombre: input.alumnoNombre || null,
    p_alumno_edad: input.alumnoEdad ?? null,
    p_origen: input.origen,
    p_perfil_id: input.perfilId || null,
    p_dia: input.dia || null,
    p_validar_horario: input.validarHorario,
    p_estado: input.estado || 'pendiente',
  })

  if (error) {
    throw error
  }

  return { success: true }
}

async function crearReservaSegura({
  nombre,
  apellido,
  telefono,
  email,
  disciplina,
  fecha,
  horario,
  alumnoNombre,
  alumnoEdad,
  origen,
}: {
  nombre: string
  apellido?: string
  telefono: string
  email?: string
  disciplina: string
  fecha: string | null
  horario: string
  alumnoNombre?: string
  alumnoEdad?: number | null
  origen: 'landing' | 'turnero'
}): Promise<ReservationActionResult> {
  const supabaseAdmin = createAdminSupabase()

  if (!supabaseAdmin) {
    return { success: false, error: missingSupabaseServiceEnvMessage }
  }

  const sessionSupabase = await createServerSupabase()
  const user = sessionSupabase
    ? (await sessionSupabase.auth.getUser()).data.user ?? null
    : null

  let nombreLimpio = normalizarTexto(nombre)
  const apellidoLimpio = normalizarTexto(apellido ?? '')
  const telefonoLimpio = normalizarTelefono(telefono)
  const emailLimpio = normalizarTexto(email ?? '')
  const disciplinaLimpia = normalizarTexto(disciplina)
  const horarioLimpio = normalizarTexto(horario)
  const alumnoNombreLimpio = normalizarTexto(alumnoNombre ?? '')

  if (!nombreLimpio && alumnoNombreLimpio && typeof alumnoEdad === 'number' && alumnoEdad >= 18) {
    nombreLimpio = alumnoNombreLimpio
  }

  if (!nombreLimpio || !telefonoLimpio || !disciplinaLimpia) {
    return { success: false, error: 'Completá los datos obligatorios antes de continuar.' }
  }

  const validarHorario = origen === 'turnero' && horarioLimpio !== HORARIO_A_COORDINAR
  const fechaLimpia = validarHorario ? fecha : null
  const diaReserva = validarHorario && fechaLimpia ? getDiaSemana(fechaLimpia) : null

  if (validarHorario) {
    if (!fechaLimpia || !diaReserva) {
      return { success: false, error: 'Seleccioná una fecha para la reserva.' }
    }

    const diasAbiertos = await obtenerDiasAbiertosAcademia(supabaseAdmin)

    if (!isDiaAbierto(diaReserva, diasAbiertos)) {
      return {
        success: false,
        error: 'La academia no recibe reservas para ese día.',
      }
    }
  }

  return crearReservaAtomica({
    nombre: nombreLimpio,
    apellido: apellidoLimpio || undefined,
    telefono: telefonoLimpio,
    email: emailLimpio || undefined,
    disciplina: disciplinaLimpia,
    fecha: fechaLimpia,
    horario: horarioLimpio,
    alumnoNombre: alumnoNombreLimpio || undefined,
    alumnoEdad: alumnoEdad ?? null,
    origen,
    perfilId: user?.id ?? null,
    dia: diaReserva,
    validarHorario,
    estado: 'pendiente',
  })
}

export async function crearReservaLandingAction(
  input: LandingReservationInput
): Promise<ReservationActionResult> {
  try {
    return await crearReservaSegura({
      nombre: input.nombre,
      apellido: input.apellido,
      telefono: input.telefono,
      disciplina: input.disciplina || 'Asesoramiento',
      fecha: null,
      horario: HORARIO_A_COORDINAR,
      origen: 'landing',
    })
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No pudimos registrar la consulta. Intentá nuevamente.',
    }
  }
}

export async function crearReservaTurneroAction(
  input: TurneroReservationInput
): Promise<ReservationActionResult> {
  try {
    return await crearReservaSegura({
      nombre: input.nombre,
      apellido: input.apellido,
      telefono: input.telefono,
      email: input.email,
      disciplina: input.disciplina,
      fecha: input.fecha || getTodayInArgentina(),
      horario: input.horario || HORARIO_A_COORDINAR,
      alumnoNombre: input.alumnoNombre,
      alumnoEdad: input.alumnoEdad ?? null,
      origen: 'turnero',
    })
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No pudimos guardar la reserva. Intentá nuevamente.',
    }
  }
}
