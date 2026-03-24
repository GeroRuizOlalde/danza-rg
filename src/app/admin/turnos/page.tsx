"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { getIniciales, getAvatarColor } from "@/lib/utils";

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

type Clase = { id: string; nombre: string };

const FILTROS = ["Todos", "Hoy", "Esta semana", "Pendientes", "Confirmados", "Cancelados"];

export default function TurnosPage() {
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [turnos, setTurnos] = useState<Reserva[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal nueva reserva
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevoTurno, setNuevoTurno] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    disciplina: "",
    fecha: "",
    horario: "",
    estado: "pendiente",
  });

  // Modal confirmación de eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTurnos();
    fetchClases();
  }, []);

  async function fetchTurnos() {
    setCargando(true);
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

  async function fetchClases() {
    const { data } = await supabase.from('clases').select('id, nombre').order('nombre');
    if (data) setClases(data);
  }

  // Cambiar estado
  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase.from('reservas').update({ estado: nuevoEstado }).eq('id', id);
    if (error) {
      toast.error("Error al actualizar el estado.");
      return;
    }
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t));
  };

  // Crear nuevo turno
  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTurno.nombre || !nuevoTurno.fecha || !nuevoTurno.horario || !nuevoTurno.disciplina) {
      toast.error("Completá todos los campos obligatorios.");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('reservas').insert([nuevoTurno]);
    setGuardando(false);
    if (error) {
      toast.error("Error al crear el turno: " + error.message);
      return;
    }
    setIsModalOpen(false);
    setNuevoTurno({ nombre: "", apellido: "", telefono: "", disciplina: "", fecha: "", horario: "", estado: "pendiente" });
    await fetchTurnos();
  };

  // Eliminar turno
  const eliminarTurno = async (id: string) => {
    const { error } = await supabase.from('reservas').delete().eq('id', id);
    if (!error) {
      setTurnos(prev => prev.filter(t => t.id !== id));
      setDeletingId(null);
    } else {
      toast.error("Error al eliminar.");
    }
  };


  const getEstadoClasses = (estado: string) => {
    switch (estado) {
      case "confirmado": return "bg-[#2DB87A]/10 text-[#17a363]";
      case "pendiente":  return "bg-[#F59E0B]/10 text-[#b07800]";
      case "cancelado":  return "bg-[#EF4444]/10 text-[#c0392b]";
      default:           return "bg-gray-100 text-gray-600";
    }
  };

  const turnosFiltrados = turnos.filter((turno) => {
    if (filtroActivo === "Todos")       return true;
    if (filtroActivo === "Pendientes")  return turno.estado === "pendiente";
    if (filtroActivo === "Confirmados") return turno.estado === "confirmado";
    if (filtroActivo === "Cancelados")  return turno.estado === "cancelado";
    if (filtroActivo === "Hoy") {
      const hoy = new Date();
      const fechaHoy = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      return turno.fecha === fechaHoy;
    }
    if (filtroActivo === "Esta semana") {
      const hoy = new Date();
      const fechaTurno = new Date(turno.fecha + 'T12:00:00');
      const diffTime = fechaTurno.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }
    return true;
  });

  // Horas disponibles para el select
  const HORAS = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Turnos</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            Administrá las reservas de clases de prueba
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#C97A96] text-white rounded-full px-5 py-2.5 text-[0.82rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md shadow-[#C97A96]/20"
        >
          + Nuevo turno
        </button>
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Pendientes", count: turnos.filter(t => t.estado === 'pendiente').length, color: "text-[#F59E0B]", bg: "bg-[#FFF8E7]" },
          { label: "Confirmados", count: turnos.filter(t => t.estado === 'confirmado').length, color: "text-[#2DB87A]", bg: "bg-green-50" },
          { label: "Total", count: turnos.length, color: "text-[#C97A96]", bg: "bg-[#FDF0F4]" },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-xl px-4 py-3 text-center border border-[#E8A0B4]/10`}>
            <div className={`text-2xl font-bold ${m.color}`}>{m.count}</div>
            <div className="text-[0.7rem] text-[#8A8A99] uppercase tracking-wide font-medium mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-2.5 mb-6 items-center">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltroActivo(f)}
            className={`px-4 py-1.5 rounded-full border-[1.5px] text-[0.8rem] font-medium transition-all ${
              filtroActivo === f
                ? "bg-[#C97A96] text-white border-[#C97A96]"
                : "bg-transparent border-[#E8A0B4]/20 text-[#4A4A55] hover:border-[#C97A96] hover:text-[#C97A96]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* TABLA */}
      <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[300px]">
          {cargando ? (
            <div className="flex items-center justify-center h-[300px] text-[#8A8A99] font-medium text-sm">
              Cargando turnos...
            </div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-[#8A8A99]">
              <div className="text-4xl mb-3">👻</div>
              <p className="font-medium text-[0.9rem]">No hay turnos para este filtro</p>
              <button onClick={() => setIsModalOpen(true)} className="mt-4 text-[#C97A96] font-medium text-sm hover:underline">
                + Crear primer turno
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Alumna", "Disciplina", "Fecha y hora", "Estado", "Contacto", "Acciones"].map(h => (
                    <th key={h} className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {turnosFiltrados.map((turno) => {
                  const [, mes, dia] = turno.fecha.split('-');
                  const fechaVisual = `${dia}/${mes}`;
                  return (
                    <tr key={turno.id} className="hover:bg-[#E8A0B4]/5 transition-colors border-b border-[#E8A0B4]/10 last:border-0">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-semibold shrink-0 ${getAvatarColor(turno.id)}`}>
                            {getIniciales(turno.nombre, turno.apellido)}
                          </div>
                          <span className="font-medium text-[#1A1A22] text-[0.85rem]">{turno.nombre} {turno.apellido}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="bg-[#E8A0B4]/15 text-[#C97A96] text-[0.7rem] font-semibold px-2.5 py-1 rounded-full">
                          {turno.disciplina}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[0.83rem] text-[#4A4A55]">
                        {fechaVisual} · {turno.horario}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-[0.7rem] font-semibold px-2.5 py-1 rounded-full capitalize ${getEstadoClasses(turno.estado)}`}>
                          {turno.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[0.83rem] text-[#4A4A55]">
                        {turno.telefono ? (
                          <a
                            href={`https://wa.me/${turno.telefono.replace(/\D/g,'')}?text=Hola ${turno.nombre}, te contactamos de R.G Danza por tu turno del ${fechaVisual}.`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Enviar WhatsApp"
                          >
                            💬 {turno.telefono}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => cambiarEstado(turno.id, 'confirmado')}
                            disabled={turno.estado === 'confirmado'}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-[#2DB87A] hover:bg-[#2DB87A]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Confirmar"
                          >✅</button>
                          <button
                            onClick={() => cambiarEstado(turno.id, 'cancelado')}
                            disabled={turno.estado === 'cancelado'}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Cancelar"
                          >✕</button>
                          <button
                            onClick={() => setDeletingId(turno.id)}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-red-400 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══════════ MODAL: NUEVO TURNO ══════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">Nuevo Turno</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#C97A96] hover:text-[#1A1A22] text-xl transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Nombre *</label>
                  <input
                    required type="text" value={nuevoTurno.nombre}
                    onChange={e => setNuevoTurno({...nuevoTurno, nombre: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Apellido</label>
                  <input
                    type="text" value={nuevoTurno.apellido}
                    onChange={e => setNuevoTurno({...nuevoTurno, apellido: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Teléfono / WhatsApp</label>
                <input
                  type="tel" value={nuevoTurno.telefono}
                  onChange={e => setNuevoTurno({...nuevoTurno, telefono: e.target.value})}
                  placeholder="Ej: 351..."
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                />
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Disciplina *</label>
                <select
                  required value={nuevoTurno.disciplina}
                  onChange={e => setNuevoTurno({...nuevoTurno, disciplina: e.target.value})}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="">Seleccionar disciplina</option>
                  {clases.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  <option value="Asesoramiento">Asesoramiento / Sin definir</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Fecha *</label>
                  <input
                    required type="date" value={nuevoTurno.fecha}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setNuevoTurno({...nuevoTurno, fecha: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Horario *</label>
                  <select
                    required value={nuevoTurno.horario}
                    onChange={e => setNuevoTurno({...nuevoTurno, horario: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                  >
                    <option value="">Elegir hora</option>
                    {HORAS.map(h => <option key={h} value={h}>{h} hs</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Estado inicial</label>
                <select
                  value={nuevoTurno.estado}
                  onChange={e => setNuevoTurno({...nuevoTurno, estado: e.target.value})}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearTurno}
                  disabled={guardando}
                  className="flex-[2] bg-[#C97A96] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Crear Turno ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: CONFIRMAR ELIMINACIÓN ══════════ */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="font-playfair text-xl font-semibold text-[#1A1A22] mb-2">¿Eliminar turno?</h3>
            <p className="text-[#8A8A99] text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarTurno(deletingId)}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-red-600 transition-all"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}