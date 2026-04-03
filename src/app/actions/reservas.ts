'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { missingSupabaseEnvMessage } from '@/lib/supabase-env'
import {
  ESTADOS_RESERVA_ACTIVA,
  HORARIO_A_COORDINAR,
  getDiaSemana,
  getTodayInArgentina,
  normalizarTelefono,
  normalizarTexto,
} from '@/lib/reservas'
import { createServerSupabase } from '@/lib/supabase-server'

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

type HorarioLookup = {
  cupo_maximo: number | null
}

async function contarReservasActivas(
  supabase: SupabaseClient,
  disciplina: string,
  fecha: string,
  horario: string
) {
  const { count, error } = await supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('disciplina', disciplina)
    .eq('fecha', fecha)
    .eq('horario', horario)
    .in('estado', [...ESTADOS_RESERVA_ACTIVA])

  if (error) {
    throw error
  }

  return count ?? 0
}

async function obtenerHorarioTurnero(
  supabase: SupabaseClient,
  disciplina: string,
  fecha: string,
  horario: string
) {
  const dia = getDiaSemana(fecha)
  const hora = Number.parseInt(horario.split(':')[0] ?? '', 10)

  if (Number.isNaN(hora)) {
    return null
  }

  const { data, error } = await supabase
    .from('horarios')
    .select('cupo_maximo, clases!inner(nombre)')
    .eq('dia', dia)
    .eq('hora', hora)
    .eq('clases.nombre', disciplina)
    .limit(1)
    .maybeSingle<HorarioLookup>()

  if (error) {
    throw error
  }

  return data
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
  fecha: string
  horario: string
  alumnoNombre?: string
  alumnoEdad?: number | null
  origen: 'landing' | 'turnero'
}): Promise<ReservationActionResult> {
  const supabase = await createServerSupabase()

  if (!supabase) {
    return { success: false, error: missingSupabaseEnvMessage }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nombreLimpio = normalizarTexto(nombre)
  const apellidoLimpio = normalizarTexto(apellido ?? '')
  const telefonoLimpio = normalizarTelefono(telefono)
  const emailLimpio = normalizarTexto(email ?? '')
  const disciplinaLimpia = normalizarTexto(disciplina)
  const horarioLimpio = normalizarTexto(horario)
  const alumnoNombreLimpio = normalizarTexto(alumnoNombre ?? '')

  if (!nombreLimpio || !telefonoLimpio || !disciplinaLimpia) {
    return { success: false, error: 'Completá los datos obligatorios antes de continuar.' }
  }

  if (origen === 'turnero' && horarioLimpio !== HORARIO_A_COORDINAR) {
    if (!fecha) {
      return { success: false, error: 'Seleccioná una fecha para la reserva.' }
    }

    const horarioExistente = await obtenerHorarioTurnero(
      supabase,
      disciplinaLimpia,
      fecha,
      horarioLimpio
    )

    if (horarioExistente) {
      const reservados = await contarReservasActivas(
        supabase,
        disciplinaLimpia,
        fecha,
        horarioLimpio
      )

      const cupoDisponible = horarioExistente.cupo_maximo || 20

      if (reservados >= cupoDisponible) {
        return {
          success: false,
          error: 'Ese horario ya se quedó sin cupo. Elegí otro para continuar.',
        }
      }
    }
  }

  const { data: reservaExistente, error: existingError } = await supabase
    .from('reservas')
    .select('id')
    .eq('fecha', fecha)
    .eq('horario', horarioLimpio)
    .eq('disciplina', disciplinaLimpia)
    .eq('telefono', telefonoLimpio)
    .in('estado', [...ESTADOS_RESERVA_ACTIVA])
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (reservaExistente) {
    return {
      success: false,
      error: 'Ya existe una reserva activa con ese teléfono para ese horario.',
    }
  }

  const { error } = await supabase.from('reservas').insert([
    {
      nombre: nombreLimpio,
      apellido: apellidoLimpio || null,
      telefono: telefonoLimpio,
      email: emailLimpio || null,
      disciplina: disciplinaLimpia,
      fecha,
      horario: horarioLimpio,
      alumno_nombre: alumnoNombreLimpio || null,
      alumno_edad: alumnoEdad ?? null,
      estado: 'pendiente',
      origen,
      perfil_id: user?.id ?? null,
    },
  ])

  if (error) {
    throw error
  }

  return { success: true }
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
      fecha: getTodayInArgentina(),
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
