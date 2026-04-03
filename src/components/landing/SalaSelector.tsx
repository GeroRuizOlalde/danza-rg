'use client'

import { useMemo, useState } from 'react'

type Celda = { clase: string; nivel: string | null } | null

type Horario = {
  hora: number
  dia: string
  sala: number
  nivel: string | null
  clases?: { nombre: string } | null
}

type FilaHorario = {
  hs: number
  lun: Celda
  mar: Celda
  mie: Celda
  jue: Celda
  vie: Celda
}

const CLAVES_DIA: Record<string, keyof Omit<FilaHorario, 'hs'>> = {
  lunes: 'lun',
  martes: 'mar',
  miercoles: 'mie',
  jueves: 'jue',
  viernes: 'vie',
}

function CeldaHorario({ celda }: { celda: Celda }) {
  if (!celda) return <td className="text-white/15">-</td>

  return (
    <td>
      {celda.clase}
      {celda.nivel && (
        <span className="nivel-badge nivel-inicio block mt-1">
          {celda.nivel}
        </span>
      )}
    </td>
  )
}

export default function SalaSelector({ horarios }: { horarios: Horario[] }) {
  const [sala, setSala] = useState<1 | 2>(1)

  const norm = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  const grillaHoraria = useMemo(() => {
    const horas = [17, 18, 19, 20, 21]
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

    return horas.map((hora) => {
      const fila: FilaHorario = {
        hs: hora,
        lun: null,
        mar: null,
        mie: null,
        jue: null,
        vie: null,
      }

      dias.forEach((dia) => {
        const coincidencia = horarios.find(
          (item) => item.hora === hora && norm(item.dia ?? '') === norm(dia) && item.sala === sala
        )
        const clave = CLAVES_DIA[norm(dia)]

        fila[clave] = coincidencia
          ? { clase: coincidencia.clases?.nombre ?? 'Clase', nivel: coincidencia.nivel ?? null }
          : null
      })

      return fila
    })
  }, [horarios, sala])

  return (
    <>
      <div className="flex gap-3 mb-8">
        {([1, 2] as const).map((numero) => (
          <button
            key={numero}
            onClick={() => setSala(numero)}
            className={`px-6 py-2 rounded-full cursor-pointer transition-all ${
              sala === numero
                ? 'bg-[#C97A96] text-white border-none'
                : 'bg-transparent text-white border-[1.5px] border-[#E8A0B4]/30'
            }`}
          >
            Sala {numero}
          </button>
        ))}
      </div>

      <div className="fade-in overflow-x-auto">
        <table className="horarios-table">
          <thead>
            <tr>
              <th>Hs.</th>
              <th>Lunes</th>
              <th>Martes</th>
              <th>Miércoles</th>
              <th>Jueves</th>
              <th>Viernes</th>
            </tr>
          </thead>
          <tbody>
            {grillaHoraria.map((row) => (
              <tr key={row.hs}>
                <td>
                  <strong className="text-[#E8A0B4]">{row.hs}</strong>
                </td>
                <CeldaHorario celda={row.lun} />
                <CeldaHorario celda={row.mar} />
                <CeldaHorario celda={row.mie} />
                <CeldaHorario celda={row.jue} />
                <CeldaHorario celda={row.vie} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
