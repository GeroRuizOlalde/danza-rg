"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Reserva = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  disciplina: string;
  fecha: string;
  horario: string;
  estado: string;
};

const FILTROS = ["Todos", "Hoy", "Esta semana", "Pendientes", "Confirmados", "Cancelados"];

export default function TurnosPage() {
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [turnos, setTurnos] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);

  // 1. Ir a buscar los datos a Supabase
  useEffect(() => {
    async function fetchTurnos() {
      try {
        const { data, error } = await supabase
          .from('reservas')
          .select('*')
          .order('fecha', { ascending: true })
          .order('horario', { ascending: true });

        if (error) throw error;
        setTurnos(data || []);
      } catch (error) {
        console.error("Error cargando turnos:", error);
      } finally {
        setCargando(false);
      }
    }

    fetchTurnos();
  }, []);

  // --- NUEVA FUNCIÓN: ACTUALIZAR ESTADO ---
  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    // 1. Actualizamos en la base de datos de Supabase
    const { error } = await supabase
      .from('reservas')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      alert("Hubo un error al actualizar el estado.");
      console.error(error);
      return;
    }

    // 2. Actualizamos la vista localmente (para no tener que recargar la página)
    setTurnos((turnosPrevios) => 
      turnosPrevios.map((turno) => 
        turno.id === id ? { ...turno, estado: nuevoEstado } : turno
      )
    );
  };
  // ----------------------------------------

  const getIniciales = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      "bg-[#E8A0B4]/20 text-[#C97A96]", 
      "bg-[#2DB87A]/15 text-[#2DB87A]", 
      "bg-[#4A4A55]/10 text-[#4A4A55]",
      "bg-[#F59E0B]/15 text-[#b07800]"
    ];
    let suma = 0;
    for (let i = 0; i < id.length; i++) suma += id.charCodeAt(i);
    return colors[suma % colors.length];
  };

  const getEstadoClasses = (estado: string) => {
    switch (estado) {
      case "confirmado": return "bg-[#2DB87A]/10 text-[#17a363]";
      case "pendiente": return "bg-[#F59E0B]/10 text-[#b07800]";
      case "cancelado": return "bg-[#EF4444]/10 text-[#c0392b]";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const turnosFiltrados = turnos.filter((turno) => {
    if (filtroActivo === "Todos") return true;
    if (filtroActivo === "Pendientes") return turno.estado === "pendiente";
    if (filtroActivo === "Confirmados") return turno.estado === "confirmado";
    if (filtroActivo === "Cancelados") return turno.estado === "cancelado";
    
    if (filtroActivo === "Hoy") {
      const hoy = new Date();
      const offset = hoy.getTimezoneOffset();
      const fechaHoy = new Date(hoy.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
      return turno.fecha === fechaHoy;
    }

    if (filtroActivo === "Esta semana") {
      const hoy = new Date();
      const fechaTurno = new Date(turno.fecha);
      const diffTime = fechaTurno.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }

    return true;
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Turnos</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            Administrá las reservas de clases de prueba y consultas
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mb-6 items-center">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltroActivo(f)}
            className={`px-4 py-1.5 rounded-full border-[1.5px] font-dm-sans text-[0.8rem] font-medium transition-all ${
              filtroActivo === f
                ? "bg-[#C97A96] text-white border-[#C97A96]"
                : "bg-transparent border-[#E8A0B4]/20 text-[#4A4A55] hover:border-[#C97A96] hover:text-[#C97A96]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[300px]">
          {cargando ? (
            <div className="flex items-center justify-center h-[300px] text-[#8A8A99] font-medium text-sm">
              Cargando turnos...
            </div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-[#8A8A99]">
              <div className="text-4xl mb-3">👻</div>
              <p className="font-medium text-[0.9rem]">No hay turnos para mostrar con este filtro</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">Alumna</th>
                  <th className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">Disciplina</th>
                  <th className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">Fecha y hora</th>
                  <th className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">Estado</th>
                  <th className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">Contacto</th>
                  <th className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnosFiltrados.map((turno) => {
                  const [, mes, dia] = turno.fecha.split('-');
                  const fechaVisual = `${dia}/${mes}`;

                  return (
                    <tr key={turno.id} className="hover:bg-[#E8A0B4]/5 transition-colors group border-b border-[#E8A0B4]/10 last:border-0">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-semibold shrink-0 ${getAvatarColor(turno.id)}`}>
                            {getIniciales(turno.nombre, turno.apellido)}
                          </div>
                          <span className="font-medium text-[#1A1A22] text-[0.85rem]">{turno.nombre} {turno.apellido}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="bg-[#E8A0B4]/15 text-[#C97A96] text-[0.7rem] font-semibold px-2.5 py-1 rounded-full">{turno.disciplina}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[0.83rem] text-[#4A4A55]">{fechaVisual} · {turno.horario}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-[0.7rem] font-semibold px-2.5 py-1 rounded-full capitalize transition-colors ${getEstadoClasses(turno.estado)}`}>
                          {turno.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[0.83rem] text-[#4A4A55]">{turno.telefono}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          {/* CONECTAMOS LOS BOTONES AQUÍ */}
                          <button 
                            onClick={() => cambiarEstado(turno.id, 'confirmado')}
                            disabled={turno.estado === 'confirmado'}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-[#2DB87A] hover:bg-[#2DB87A]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" 
                            title="Confirmar"
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => cambiarEstado(turno.id, 'cancelado')}
                            disabled={turno.estado === 'cancelado'}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" 
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}