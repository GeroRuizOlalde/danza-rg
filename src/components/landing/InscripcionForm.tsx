'use client'

import { useState } from 'react'
import { crearReservaLandingAction } from '@/app/actions/reservas'

type ClaseOption = { id: string; nombre: string }

export default function InscripcionForm({
  telefonoDinamico,
  clases,
}: {
  telefonoDinamico: string
  clases: ClaseOption[]
}) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const numeroLimpio = telefonoDinamico.replace(/\D/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre || !telefono) return

    setEnviando(true)
    setError('')

    const result = await crearReservaLandingAction({
      nombre,
      apellido,
      telefono,
      disciplina,
    })

    setEnviando(false)

    if (!result.success) {
      setError(result.error || 'Hubo un error al enviar. Intenta de nuevo.')
      return
    }

    setEnviado(true)
    setNombre('')
    setApellido('')
    setTelefono('')
    setDisciplina('')
  }

  if (enviado) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">OK</div>
        <h3 className="font-playfair text-xl text-[#1A1A22] mb-2">Recibimos tu consulta</h3>
        <p className="text-[#8A8A99] text-sm mb-6 leading-relaxed">
          En breve nos comunicamos con vos por WhatsApp para coordinar tu clase de
          prueba.
        </p>
        <button
          onClick={() => setEnviado(false)}
          className="border-[1.5px] border-[#F5D0DC] text-[#C97A96] px-6 py-2.5 rounded-full cursor-pointer text-sm font-medium hover:bg-[#FDF0F4] transition-colors"
        >
          Enviar otra consulta
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <input
          className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-[10px] px-4 py-3 text-sm outline-none focus:border-[#C97A96] transition-colors"
          type="text"
          placeholder="Nombre"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-[10px] px-4 py-3 text-sm outline-none focus:border-[#C97A96] transition-colors"
          type="text"
          placeholder="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
        />
      </div>
      <input
        className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-[10px] px-4 py-3 text-sm outline-none focus:border-[#C97A96] transition-colors mb-5"
        type="tel"
        placeholder="Telefono (WhatsApp)"
        required
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
      />
      <select
        className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-[10px] px-4 py-3 text-sm outline-none focus:border-[#C97A96] bg-white transition-colors mb-5"
        value={disciplina}
        onChange={(e) => setDisciplina(e.target.value)}
      >
        <option value="">Selecciona una clase</option>
        {clases.map((clase) => (
          <option key={clase.id} value={clase.nombre}>
            {clase.nombre}
          </option>
        ))}
        <option value="Asesoramiento">Quiero asesoramiento</option>
      </select>

      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-[#C97A96] text-white border-none rounded-full py-3.5 font-semibold cursor-pointer transition-colors hover:bg-[#1A1A22] disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {enviando ? 'Enviando...' : 'Enviar inscripcion ->'}
      </button>
      <a
        href={`https://wa.me/${numeroLimpio}`}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-[#C97A96] no-underline text-sm mt-4 hover:underline"
      >
        Escribinos por WhatsApp
      </a>
    </form>
  )
}
