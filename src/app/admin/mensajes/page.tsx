"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { actualizarReservaEstadoAdminAction, eliminarReservaAdminAction } from "@/app/admin/actions";

type Mensaje = {
  id: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  disciplina: string;
  estado: string;
  created_at: string;
};

const ESTADOS = ["pendiente", "confirmado", "cancelado"];

const ESTADO_STYLE: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-600 border-amber-100",
  confirmado: "bg-emerald-50 text-emerald-600 border-emerald-100",
  cancelado: "bg-gray-100 text-gray-400 border-gray-200",
};

export default function MensajesPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);

  async function fetchMensajes() {
    setCargando(true);
    const { data, error } = await supabase
      .from("reservas")
      .select("id, nombre, apellido, telefono, email, disciplina, estado, created_at")
      .eq("origen", "landing")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar mensajes.");
    } else {
      setMensajes(data || []);
    }
    setCargando(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchMensajes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    setCambiandoId(id);
    const result = await actualizarReservaEstadoAdminAction(id, nuevoEstado);
    if (result.success) {
      setMensajes((prev) =>
        prev.map((m) => (m.id === id ? { ...m, estado: nuevoEstado } : m))
      );
    } else {
      toast.error(result.error ?? "Error al actualizar.");
    }
    setCambiandoId(null);
  };

  const handleEliminar = async (id: string) => {
    const result = await eliminarReservaAdminAction(id);
    if (result.success) {
      setMensajes((prev) => prev.filter((m) => m.id !== id));
      toast.success("Mensaje eliminado.");
    } else {
      toast.error(result.error ?? "Error al eliminar.");
    }
    setEliminandoId(null);
  };

  const mensajesFiltrados =
    filtroEstado === "todos"
      ? mensajes
      : mensajes.filter((m) => m.estado === filtroEstado);

  const pendientes = mensajes.filter((m) => m.estado === "pendiente").length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-[#1A1A22]">
            Mensajes del formulario
          </h1>
          <p className="text-[#8A8A99] text-sm mt-1">
            Consultas enviadas desde el formulario de la página principal.
          </p>
        </div>
        {pendientes > 0 && (
          <span className="bg-amber-400 text-white text-sm font-bold px-3 py-1.5 rounded-full">
            {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["todos", ...ESTADOS].map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setFiltroEstado(e)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all capitalize ${
              filtroEstado === e
                ? "bg-[#1A1A22] text-white border-[#1A1A22]"
                : "bg-white text-[#8A8A99] border-gray-200 hover:border-gray-300"
            }`}
          >
            {e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
            {e === "pendiente" && pendientes > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full">
                {pendientes}
              </span>
            )}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="text-center py-16 text-[#8A8A99]">Cargando...</div>
      ) : mensajesFiltrados.length === 0 ? (
        <div className="text-center py-16 text-[#8A8A99]">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">No hay mensajes{filtroEstado !== "todos" ? ` ${filtroEstado}s` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mensajesFiltrados.map((m) => {
            const fecha = new Date(m.created_at).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const nombreCompleto = [m.nombre, m.apellido].filter(Boolean).join(" ");
            const telLimpio = m.telefono?.replace(/\D/g, "");

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-[#1A1A22]">{nombreCompleto}</span>
                      <span
                        className={`text-[0.65rem] font-bold uppercase px-2 py-0.5 rounded border ${ESTADO_STYLE[m.estado] ?? ESTADO_STYLE.pendiente}`}
                      >
                        {m.estado}
                      </span>
                    </div>
                    <p className="text-sm text-[#8A8A99] mb-2">{fecha}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      {m.disciplina && (
                        <span className="text-[#C97A96] font-medium">
                          {m.disciplina}
                        </span>
                      )}
                      {m.telefono && (
                        <a
                          href={`https://wa.me/${telLimpio}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#8A8A99] hover:text-[#25D366] transition-colors"
                        >
                          📱 {m.telefono}
                        </a>
                      )}
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className="text-[#8A8A99] hover:text-[#1A1A22] transition-colors"
                        >
                          ✉ {m.email}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.estado}
                      disabled={cambiandoId === m.id}
                      onChange={(e) => handleCambiarEstado(m.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none bg-white text-[#1A1A22] cursor-pointer hover:border-[#C97A96] transition-colors"
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                          {e.charAt(0).toUpperCase() + e.slice(1)}
                        </option>
                      ))}
                    </select>

                    {eliminandoId === m.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEliminar(m.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEliminandoId(null)}
                          className="text-xs text-[#8A8A99]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEliminandoId(m.id)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
