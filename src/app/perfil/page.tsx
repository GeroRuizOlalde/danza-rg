"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

type Perfil = {
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  autoriza_imagen: boolean | null;
  apto_medico: boolean | null;
  fotocopia_dni: boolean | null;
};

type Reserva = {
  id: string;
  disciplina: string;
  fecha: string | null;
  horario: string;
  alumno_nombre: string | null;
  estado: string;
  created_at: string;
};

type PerfilForm = {
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_nacimiento: string;
  autoriza_imagen: boolean;
};

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<PerfilForm>({
    nombre: "",
    apellido: "",
    telefono: "",
    fecha_nacimiento: "",
    autoriza_imagen: false,
  });

  async function fetchPerfil() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: perfilData } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
    const { data: reservasData } = await supabase
      .from("reservas")
      .select("id, disciplina, fecha, horario, alumno_nombre, estado, created_at")
      .eq("perfil_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (perfilData) {
      setPerfil(perfilData);
      setFormData({
        nombre: perfilData.nombre || "",
        apellido: perfilData.apellido || "",
        telefono: perfilData.telefono || "",
        fecha_nacimiento: perfilData.fecha_nacimiento || "",
        autoriza_imagen: perfilData.autoriza_imagen || false,
      });
    }

    setReservas(reservasData || []);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPerfil();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("perfiles").update(formData).eq("id", user.id);

    if (!error) {
      toast.success("¡Perfil actualizado!");
      setEditMode(false);
      await fetchPerfil();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F7F9]">
      <Navbar />
      <div className="pt-32 px-6 pb-20 max-w-2xl mx-auto">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-[#E8A0B4]/10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="font-playfair text-3xl font-bold text-[#1A1A22]">Mi <em className="text-[#C97A96] not-italic">Perfil</em></h1>
              <p className="text-[#8A8A99] text-sm mt-1">Mantené tus datos actualizados para tus reservas.</p>
            </div>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="text-[#C97A96] text-sm font-bold border border-[#C97A96]/30 px-5 py-2 rounded-full hover:bg-[#FDF0F4]">
                Editar datos
              </button>
            )}
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <input disabled={!editMode} value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3 text-sm disabled:opacity-60" placeholder="Nombre" />
              <input disabled={!editMode} value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3 text-sm disabled:opacity-60" placeholder="Apellido" />
            </div>
            <input disabled={!editMode} value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3 text-sm disabled:opacity-60" placeholder="WhatsApp de contacto" />
            <input disabled={!editMode} type="date" value={formData.fecha_nacimiento} onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })} className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3 text-sm disabled:opacity-60" />

            <label className="flex items-start gap-3 cursor-pointer bg-[#FDF0F4]/50 p-5 rounded-2xl">
              <input disabled={!editMode} type="checkbox" checked={formData.autoriza_imagen} onChange={(e) => setFormData({ ...formData, autoriza_imagen: e.target.checked })} className="mt-1 accent-[#C97A96]" />
              <span className="text-sm text-[#4A4A55]">Autorizo el uso de mi imagen para redes sociales de la academia.</span>
            </label>

            {editMode && (
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditMode(false)} className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-2xl font-bold text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#1A1A22] text-white px-10 py-3 rounded-2xl font-bold text-sm hover:bg-[#C97A96]">Guardar cambios</button>
              </div>
            )}
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${perfil?.apto_medico ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"} text-center`}>
              <p className="text-[10px] font-black uppercase mb-1">Apto médico</p>
              <p className="text-xs font-bold">{perfil?.apto_medico ? "ENTREGADO" : "PENDIENTE"}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${perfil?.fotocopia_dni ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"} text-center`}>
              <p className="text-[10px] font-black uppercase mb-1">Copia DNI</p>
              <p className="text-xs font-bold">{perfil?.fotocopia_dni ? "ENTREGADO" : "PENDIENTE"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-[#E8A0B4]/10 mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-playfair text-2xl font-bold text-[#1A1A22]">Mis <em className="text-[#C97A96] not-italic">Reservas</em></h2>
              <p className="text-[#8A8A99] text-xs mt-1">Historial de clases de prueba reservadas</p>
            </div>
            <Link href="/turnero" className="text-[#C97A96] text-sm font-bold border border-[#C97A96]/30 px-5 py-2 rounded-full hover:bg-[#FDF0F4] transition-colors">
              + Nueva reserva
            </Link>
          </div>

          {reservas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-[#8A8A99] text-sm">Todavía no tenés reservas.</p>
              <Link href="/turnero" className="inline-block mt-4 text-[#C97A96] text-sm font-bold hover:underline">
                Reservar clase de prueba →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reservas.map((reserva) => {
                const estadoMap: Record<string, { label: string; cls: string }> = {
                  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-600 border-amber-100" },
                  confirmado: { label: "Confirmada", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                  cancelado: { label: "Cancelada", cls: "bg-red-50 text-red-500 border-red-100" },
                  completado: { label: "Completada", cls: "bg-blue-50 text-blue-600 border-blue-100" },
                };
                const badge = estadoMap[reserva.estado] || estadoMap.pendiente;
                const fechaStr = reserva.fecha ? new Date(`${reserva.fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }) : "Sin fecha";
                return (
                  <div key={reserva.id} className="flex items-center gap-4 p-4 bg-[#F7F7F9]/60 rounded-2xl border border-[#E8A0B4]/10">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F5D0DC] to-[#E8A0B4] flex items-center justify-center text-lg shrink-0">🩰</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1A1A22] truncate">{reserva.disciplina}</span>
                        {reserva.alumno_nombre && <span className="text-xs text-[#8A8A99] truncate">· {reserva.alumno_nombre}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#8A8A99]">
                        <span>{fechaStr}</span>
                        {reserva.horario && reserva.horario !== "A coordinar" && <span className="text-[#4A4A55] font-medium">{reserva.horario} hs</span>}
                      </div>
                    </div>
                    <span className={`text-[0.68rem] font-bold px-2.5 py-1 rounded-full border shrink-0 ${badge.cls}`}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
