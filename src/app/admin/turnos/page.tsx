"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getDiaSemana, HORARIO_A_COORDINAR } from "@/lib/reservas";
import { supabase } from "@/lib/supabase";
import { getAvatarColor, getIniciales } from "@/lib/utils";
import {
  actualizarReservaEstadoAdminAction,
  crearReservaAdminAction,
  eliminarReservaAdminAction,
} from "../actions";

type Reserva = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  disciplina: string;
  fecha: string | null;
  horario: string;
  estado: string;
  origen?: string;
  perfil_id?: string | null;
};

type Clase = {
  id: string;
  nombre: string;
};

type Horario = {
  id: string;
  clase_id: string;
  dia: string;
  hora: number;
  sala: number;
  nivel: string | null;
};

type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string | null;
  estado?: string | null;
};

type NuevoTurnoForm = {
  perfilId: string;
  nombre: string;
  apellido: string;
  telefono: string;
  disciplina: string;
  fecha: string;
  horario: string;
  estado: string;
};

const FILTROS = [
  "Todos",
  "Hoy",
  "Esta semana",
  "Pasados",
  "Archivados",
  "Pendientes",
  "Confirmados",
  "Cancelados",
];

const ARCHIVE_AFTER_DAYS = 30;

const EMPTY_NUEVO_TURNO: NuevoTurnoForm = {
  perfilId: "",
  nombre: "",
  apellido: "",
  telefono: "",
  disciplina: "",
  fecha: "",
  horario: "",
  estado: "pendiente",
};

function getTodayIso() {
  const hoy = new Date();
  return new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function getHorarioSortValue(horario: string) {
  return /^\d{2}:\d{2}$/.test(horario) ? horario : "99:99";
}

function compareTurnosAsc(a: Reserva, b: Reserva) {
  if (!a.fecha && !b.fecha) {
    return getHorarioSortValue(a.horario).localeCompare(getHorarioSortValue(b.horario));
  }

  if (!a.fecha) return 1;
  if (!b.fecha) return -1;

  if (a.fecha !== b.fecha) {
    return a.fecha.localeCompare(b.fecha);
  }

  return getHorarioSortValue(a.horario).localeCompare(getHorarioSortValue(b.horario));
}

function compareTurnosDesc(a: Reserva, b: Reserva) {
  return compareTurnosAsc(b, a);
}

function compareTurnosPorProximidad(a: Reserva, b: Reserva, hoyIso: string) {
  if (!a.fecha && !b.fecha) return compareTurnosAsc(a, b);
  if (!a.fecha) return 1;
  if (!b.fecha) return -1;

  const aEsProximo = a.fecha >= hoyIso;
  const bEsProximo = b.fecha >= hoyIso;

  if (aEsProximo && bEsProximo) {
    return compareTurnosAsc(a, b);
  }

  if (!aEsProximo && !bEsProximo) {
    return compareTurnosDesc(a, b);
  }

  return aEsProximo ? -1 : 1;
}

function esEstaSemana(fecha: string | null, hoyIso: string) {
  if (!fecha) return false;
  const hoy = new Date(`${hoyIso}T00:00:00`);
  const fechaTurno = new Date(`${fecha}T00:00:00`);
  const diffTime = fechaTurno.getTime() - hoy.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

function getDiffDays(fecha: string | null, hoyIso: string) {
  if (!fecha) return Number.POSITIVE_INFINITY;
  const hoy = new Date(`${hoyIso}T00:00:00`);
  const fechaTurno = new Date(`${fecha}T00:00:00`);
  return Math.floor((fechaTurno.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function isArchivedTurno(fecha: string | null, hoyIso: string) {
  return getDiffDays(fecha, hoyIso) <= -ARCHIVE_AFTER_DAYS;
}

export default function TurnosPage() {
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [turnos, setTurnos] = useState<Reserva[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const hoyIso = useMemo(() => getTodayIso(), []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevoTurno, setNuevoTurno] = useState<NuevoTurnoForm>(EMPTY_NUEVO_TURNO);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTurnos();
    fetchClases();
    fetchHorarios();
    fetchClientes();
  }, []);

  async function fetchTurnos() {
    setCargando(true);

    try {
      const { data, error } = await supabase
        .from("reservas")
        .select("*")
        .neq("origen", "landing")
        .order("fecha", { ascending: true })
        .order("horario", { ascending: true });

      if (error) {
        throw error;
      }

      setTurnos(data || []);
    } catch (error) {
      console.error("Error cargando turnos:", error);
    } finally {
      setCargando(false);
    }
  }

  async function fetchClases() {
    const { data } = await supabase.from("clases").select("id, nombre").order("nombre");
    if (data) {
      setClases(data);
    }
  }

  async function fetchHorarios() {
    const { data } = await supabase
      .from("horarios")
      .select("id, clase_id, dia, hora, sala, nivel")
      .order("dia")
      .order("hora");

    if (data) {
      setHorarios(data);
    }
  }

  function resetNuevoTurno() {
    setNuevoTurno(EMPTY_NUEVO_TURNO);
    setBusquedaCliente("");
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetNuevoTurno();
  }

  function getClienteLabel(cliente: Cliente) {
    const nombreCompleto = [cliente.apellido, cliente.nombre].filter(Boolean).join(", ");
    const telefono = cliente.telefono?.trim() ? ` · ${cliente.telefono}` : "";
    return `${nombreCompleto || "Sin nombre"}${telefono}`;
  }

  function handleSeleccionarCliente(clienteId: string) {
    const cliente = clientes.find((item) => item.id === clienteId);

    if (!cliente) {
      setBusquedaCliente("");
      setNuevoTurno((prev) => ({ ...prev, perfilId: "" }));
      return;
    }

    setBusquedaCliente("");
    setNuevoTurno((prev) => ({
      ...prev,
      perfilId: cliente.id,
      nombre: cliente.nombre || "",
      apellido: cliente.apellido || "",
      telefono: cliente.telefono || "",
    }));
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido, telefono, email, estado")
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (data) {
      setClientes(data);
    }
  }

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id === nuevoTurno.perfilId) || null,
    [clientes, nuevoTurno.perfilId]
  );

  const clientesFiltrados = useMemo(() => {
    const termino = busquedaCliente.trim().toLowerCase();

    if (!termino) {
      return clientes;
    }

    return clientes.filter((cliente) =>
      [cliente.nombre, cliente.apellido, cliente.telefono, cliente.email]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termino))
    );
  }, [busquedaCliente, clientes]);

  const horariosDisponibles = useMemo(() => {
    if (!nuevoTurno.disciplina) {
      return [];
    }

    if (nuevoTurno.disciplina === "Asesoramiento") {
      return [
        {
          value: HORARIO_A_COORDINAR,
          label: HORARIO_A_COORDINAR,
        },
      ];
    }

    const claseSeleccionada = clases.find((clase) => clase.nombre === nuevoTurno.disciplina);

    if (!claseSeleccionada || !nuevoTurno.fecha) {
      return [];
    }

    const diaSeleccionado = getDiaSemana(nuevoTurno.fecha);

    return horarios
      .filter(
        (horario) =>
          horario.clase_id === claseSeleccionada.id && horario.dia === diaSeleccionado
      )
      .sort((a, b) => a.hora - b.hora || a.sala - b.sala)
      .map((horario) => {
        const hora = `${String(horario.hora).padStart(2, "0")}:00`;
        const detalles = [`Sala ${horario.sala}`];

        if (horario.nivel?.trim()) {
          detalles.push(horario.nivel.trim());
        }

        return {
          value: hora,
          label: `${hora} hs · ${detalles.join(" · ")}`,
        };
      });
  }, [clases, horarios, nuevoTurno.disciplina, nuevoTurno.fecha]);

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    const result = await actualizarReservaEstadoAdminAction(id, nuevoEstado);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setTurnos((prev) =>
      prev.map((turno) => (turno.id === id ? { ...turno, estado: nuevoEstado } : turno))
    );
  };

  const handleCrearTurno = async () => {
    if (!nuevoTurno.nombre || !nuevoTurno.fecha || !nuevoTurno.horario || !nuevoTurno.disciplina) {
      toast.error("Completá todos los campos obligatorios.");
      return;
    }

    setGuardando(true);
    const result = await crearReservaAdminAction(nuevoTurno);
    setGuardando(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    handleCloseModal();
    await fetchTurnos();
  };

  const eliminarTurno = async (id: string) => {
    const result = await eliminarReservaAdminAction(id);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setTurnos((prev) => prev.filter((turno) => turno.id !== id));
    setDeletingId(null);
  };

  const getEstadoClasses = (estado: string) => {
    switch (estado) {
      case "confirmado":
        return "bg-[#2DB87A]/10 text-[#17a363]";
      case "pendiente":
        return "bg-[#F59E0B]/10 text-[#b07800]";
      case "cancelado":
        return "bg-[#EF4444]/10 text-[#c0392b]";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const turnosArchivados = useMemo(
    () => turnos.filter((turno) => isArchivedTurno(turno.fecha, hoyIso)),
    [hoyIso, turnos]
  );

  const turnosOperativos = useMemo(
    () => turnos.filter((turno) => !isArchivedTurno(turno.fecha, hoyIso)),
    [hoyIso, turnos]
  );

  const turnosFiltrados = useMemo(() => {
    const base = filtroActivo === "Archivados" ? turnosArchivados : turnosOperativos;
    const filtrados = base.filter((turno) => {
      if (filtroActivo === "Todos") return !turno.fecha || turno.fecha >= hoyIso;
      if (filtroActivo === "Pasados") return turno.fecha !== null && turno.fecha < hoyIso;
      if (filtroActivo === "Archivados") return true;
      if (filtroActivo === "Pendientes") return turno.estado === "pendiente";
      if (filtroActivo === "Confirmados") return turno.estado === "confirmado";
      if (filtroActivo === "Cancelados") return turno.estado === "cancelado";
      if (filtroActivo === "Hoy") return turno.fecha === hoyIso;
      if (filtroActivo === "Esta semana") return esEstaSemana(turno.fecha, hoyIso);
      return true;
    });

    if (filtroActivo === "Pasados") {
      return filtrados.sort(compareTurnosDesc);
    }

    if (filtroActivo === "Archivados") {
      return filtrados.sort(compareTurnosDesc);
    }

    if (filtroActivo === "Todos" || filtroActivo === "Hoy" || filtroActivo === "Esta semana") {
      return filtrados.sort(compareTurnosAsc);
    }

    return filtrados.sort((a, b) => compareTurnosPorProximidad(a, b, hoyIso));
  }, [filtroActivo, hoyIso, turnosArchivados, turnosOperativos]);

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Turnos</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            Administrá las reservas de clases de prueba
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetNuevoTurno();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C97A96] px-5 py-2.5 text-[0.82rem] font-semibold text-white shadow-md shadow-[#C97A96]/20 transition-all hover:bg-[#1A1A22] sm:w-auto"
        >
          + Nuevo turno
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Pendientes",
            count: turnosOperativos.filter((turno) => turno.estado === "pendiente").length,
            color: "text-[#F59E0B]",
            bg: "bg-[#FFF8E7]",
          },
          {
            label: "Confirmados",
            count: turnosOperativos.filter((turno) => turno.estado === "confirmado").length,
            color: "text-[#2DB87A]",
            bg: "bg-green-50",
          },
          {
            label: "Archivados",
            count: turnosArchivados.length,
            color: "text-[#C97A96]",
            bg: "bg-[#FDF0F4]",
          },
        ].map((metrica) => (
          <div
            key={metrica.label}
            className={`${metrica.bg} rounded-xl px-4 py-3 text-center border border-[#E8A0B4]/10`}
          >
            <div className={`text-2xl font-bold ${metrica.color}`}>{metrica.count}</div>
            <div className="text-[0.7rem] text-[#8A8A99] uppercase tracking-wide font-medium mt-0.5">
              {metrica.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex gap-2.5 overflow-x-auto pb-2">
        {FILTROS.map((filtro) => (
          <button
            key={filtro}
            type="button"
            onClick={() => setFiltroActivo(filtro)}
            className={`whitespace-nowrap rounded-full border-[1.5px] px-4 py-1.5 text-[0.8rem] font-medium transition-all ${
              filtroActivo === filtro
                ? "bg-[#C97A96] text-white border-[#C97A96]"
                : "bg-transparent border-[#E8A0B4]/20 text-[#4A4A55] hover:border-[#C97A96] hover:text-[#C97A96]"
            }`}
          >
            {filtro}
          </button>
        ))}
      </div>

      <p className="text-[0.74rem] text-[#8A8A99] mb-6">
        Los turnos con más de {ARCHIVE_AFTER_DAYS} días de antigüedad pasan a <strong>Archivados</strong> automáticamente.
      </p>

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
              <button
                type="button"
                onClick={() => {
                  resetNuevoTurno();
                  setIsModalOpen(true);
                }}
                className="mt-4 text-[#C97A96] font-medium text-sm hover:underline"
              >
                + Crear primer turno
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Alumna", "Disciplina", "Fecha y hora", "Estado", "Contacto", "Acciones"].map(
                    (header) => (
                      <th
                        key={header}
                        className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {turnosFiltrados.map((turno) => {
                  const fechaVisual = turno.fecha
                    ? (() => {
                        const [, mes, dia] = turno.fecha.split("-");
                        return `${dia}/${mes}`;
                      })()
                    : "A coordinar";

                  return (
                    <tr
                      key={turno.id}
                      className="hover:bg-[#E8A0B4]/5 transition-colors border-b border-[#E8A0B4]/10 last:border-0"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-semibold shrink-0 ${getAvatarColor(
                              turno.id
                            )}`}
                          >
                            {getIniciales(turno.nombre, turno.apellido)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#1A1A22] text-[0.85rem]">
                              {turno.nombre} {turno.apellido}
                            </span>
                            {turno.perfil_id && (
                              <span
                                className="text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100"
                                title="Turno vinculado a una cuenta existente de clientes"
                              >
                                Cliente
                              </span>
                            )}
                            {turno.origen === "landing" && (
                              <span
                                className="text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 border border-blue-100"
                                title="Vino desde el formulario de la landing"
                              >
                                Web
                              </span>
                            )}
                            {turno.origen === "turnero" && (
                              <span
                                className="text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FDF0F4] text-[#C97A96] border border-[#E8A0B4]/30"
                                title="Reservó desde el turnero online"
                              >
                                Turnero
                              </span>
                            )}
                            {turno.horario === "A coordinar" && !turno.origen && (
                              <span
                                className="text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100"
                                title="Horario pendiente de coordinar"
                              >
                                Coordinar
                              </span>
                            )}
                          </div>
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
                        <span
                          className={`text-[0.7rem] font-semibold px-2.5 py-1 rounded-full capitalize ${getEstadoClasses(
                            turno.estado
                          )}`}
                        >
                          {turno.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[0.83rem] text-[#4A4A55]">
                        {turno.telefono ? (
                          <a
                            href={`https://wa.me/${turno.telefono.replace(/\D/g, "")}?text=Hola ${turno.nombre}, te contactamos de R.G Danza por tu turno del ${fechaVisual}.`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Enviar WhatsApp"
                          >
                            💬 {turno.telefono}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => cambiarEstado(turno.id, "confirmado")}
                            disabled={turno.estado === "confirmado"}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-[#2DB87A] hover:bg-[#2DB87A]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Confirmar"
                          >
                            ✅
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarEstado(turno.id, "cancelado")}
                            disabled={turno.estado === "cancelado"}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(turno.id)}
                            className="w-7 h-7 rounded-md border border-[#E8A0B4]/20 flex items-center justify-center text-[12px] hover:border-red-400 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">
                Nuevo Turno
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-[#C97A96] hover:text-[#1A1A22] text-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-6 space-y-4">
              <div className="rounded-2xl border border-[#E8A0B4]/20 bg-[#FDF0F4]/40 p-4">
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                  Cuenta existente en clientes
                </label>
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(event) => setBusquedaCliente(event.target.value)}
                  placeholder="Buscar por nombre, apellido, telefono o email"
                  className="mb-3 w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                />
                <select
                  value={nuevoTurno.perfilId}
                  onChange={(event) => handleSeleccionarCliente(event.target.value)}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="">Sin cuenta asociada / carga manual</option>
                  {clientesFiltrados.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {getClienteLabel(cliente)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[0.72rem] text-[#8A8A99]">
                  Si seleccionas un cliente, el turno queda vinculado a esa cuenta y se usan sus datos guardados.
                </p>
                {clienteSeleccionado && (
                  <p className="mt-2 text-[0.72rem] font-medium text-[#C97A96]">
                    Cliente seleccionado: {getClienteLabel(clienteSeleccionado)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Nombre *
                  </label>
                  <input
                    required
                    type="text"
                    disabled={Boolean(clienteSeleccionado)}
                    value={nuevoTurno.nombre}
                    onChange={(event) =>
                      setNuevoTurno({ ...nuevoTurno, nombre: event.target.value })
                    }
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all disabled:bg-gray-50 disabled:text-[#8A8A99] disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Apellido
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(clienteSeleccionado)}
                    value={nuevoTurno.apellido}
                    onChange={(event) =>
                      setNuevoTurno({ ...nuevoTurno, apellido: event.target.value })
                    }
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all disabled:bg-gray-50 disabled:text-[#8A8A99] disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  disabled={Boolean(clienteSeleccionado)}
                  value={nuevoTurno.telefono}
                  onChange={(event) =>
                    setNuevoTurno({ ...nuevoTurno, telefono: event.target.value })
                  }
                  placeholder="Ej: 351..."
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all disabled:bg-gray-50 disabled:text-[#8A8A99] disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                  Disciplina *
                </label>
                <select
                  required
                  value={nuevoTurno.disciplina}
                  onChange={(event) =>
                    setNuevoTurno({
                      ...nuevoTurno,
                      disciplina: event.target.value,
                      horario: "",
                    })
                  }
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="">Seleccionar disciplina</option>
                  {clases.map((clase) => (
                    <option key={clase.id} value={clase.nombre}>
                      {clase.nombre}
                    </option>
                  ))}
                  <option value="Asesoramiento">Asesoramiento / Sin definir</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Fecha *
                  </label>
                  <input
                    required
                    type="date"
                    value={nuevoTurno.fecha}
                    min={hoyIso}
                    onChange={(event) =>
                      setNuevoTurno({ ...nuevoTurno, fecha: event.target.value, horario: "" })
                    }
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Horario *
                  </label>
                  <select
                    required
                    disabled={!nuevoTurno.disciplina || (nuevoTurno.disciplina !== "Asesoramiento" && !nuevoTurno.fecha)}
                    value={nuevoTurno.horario}
                    onChange={(event) =>
                      setNuevoTurno({ ...nuevoTurno, horario: event.target.value })
                    }
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                  >
                    <option value="">
                      {nuevoTurno.disciplina === "Asesoramiento"
                        ? "Elegir modalidad"
                        : !nuevoTurno.disciplina
                          ? "Elegí una disciplina"
                          : !nuevoTurno.fecha
                            ? "Elegí una fecha"
                            : horariosDisponibles.length === 0
                              ? "Sin horarios disponibles"
                              : "Elegir hora"}
                    </option>
                    {horariosDisponibles.map((horario) => (
                      <option key={`${horario.value}-${horario.label}`} value={horario.value}>
                        {horario.label}
                      </option>
                    ))}
                  </select>
                  {nuevoTurno.disciplina !== "Asesoramiento" && nuevoTurno.fecha && horariosDisponibles.length === 0 && (
                    <p className="mt-1.5 text-[0.72rem] text-[#8A8A99]">
                      No hay horarios cargados para esa clase en el día seleccionado.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                  Estado inicial
                </label>
                <select
                  value={nuevoTurno.estado}
                  onChange={(event) =>
                    setNuevoTurno({ ...nuevoTurno, estado: event.target.value })
                  }
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearTurno}
                  disabled={guardando}
                  className="flex-[2] bg-[#C97A96] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Crear turno ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="font-playfair text-xl font-semibold text-[#1A1A22] mb-2">
              ¿Eliminar turno?
            </h3>
            <p className="text-[#8A8A99] text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
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
