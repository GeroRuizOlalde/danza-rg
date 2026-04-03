export const ESTADOS_RESERVA_ACTIVA = ['pendiente', 'confirmado'] as const
export const DISCIPLINA_ASESORAMIENTO = 'No sé cuál elegir'
export const HORARIO_A_COORDINAR = 'A coordinar'
export const RESERVAS_TIMEZONE = 'America/Argentina/Buenos_Aires'

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

export function normalizarTexto(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizarTelefono(value: string) {
  return value.replace(/\D/g, '')
}

export function formatHoraReserva(hora: number | string) {
  return `${Number(hora)}:00`
}

export function formatDateForDb(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0]
}

export function getTodayInArgentina() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESERVAS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

export function getDiaSemana(fechaIso: string) {
  const fecha = new Date(`${fechaIso}T12:00:00`)
  return DIAS_SEMANA[fecha.getDay()]
}

export function buildReservationKey({
  disciplina,
  fecha,
  horario,
}: {
  disciplina: string
  fecha: string
  horario: string
}) {
  return [
    normalizarTexto(disciplina).toLowerCase(),
    fecha,
    horario,
  ].join('|')
}
