import { describe, expect, it, vi } from 'vitest'
import {
  DISCIPLINA_ASESORAMIENTO,
  HORARIO_A_COORDINAR,
  buildReservationKey,
  formatDateForDb,
  formatHoraReserva,
  getDiaSemana,
  getTodayInArgentina,
  normalizarTelefono,
  normalizarTexto,
} from './reservas'

describe('reservas helpers', () => {
  it('normaliza texto y telefono', () => {
    expect(normalizarTexto('  Clase   de   prueba  ')).toBe('Clase de prueba')
    expect(normalizarTelefono('+54 9 351-123-4567')).toBe('5493511234567')
  })

  it('formatea hora y fecha para la base', () => {
    expect(formatHoraReserva(18)).toBe('18:00')
    expect(formatDateForDb(new Date('2026-04-04T15:00:00.000Z'))).toBe('2026-04-04')
  })

  it('arma una key estable para un slot de reserva', () => {
    expect(
      buildReservationKey({
        disciplina: 'Jazz Inicial',
        fecha: '2026-04-08',
        horario: '18:00',
      })
    ).toBe('jazz inicial|2026-04-08|18:00')
  })

  it('devuelve el dia de semana esperado y mantiene constantes del flujo', () => {
    expect(getDiaSemana('2026-04-08')).toBe('Miércoles')
    expect(DISCIPLINA_ASESORAMIENTO).toBe('No sé cuál elegir')
    expect(HORARIO_A_COORDINAR).toBe('A coordinar')
  })

  it('calcula la fecha de hoy en argentina', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T03:15:00.000Z'))

    expect(getTodayInArgentina()).toBe('2026-04-04')

    vi.useRealTimers()
  })
})
