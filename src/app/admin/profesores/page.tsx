"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import {
  guardarProfesorAdminAction,
  eliminarProfesorAdminAction,
  marcarAsistenciaProfesorAdminAction,
  toggleProfesorActivoAdminAction,
} from "../actions";

// ─── Tipos ────────────────────────────────────────────────────
type Profesor = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  disciplina: string;
  activo: boolean;
};

type Asistencia = {
  id: string;
  profesor_id: string;
  fecha: string;        // YYYY-MM-DD
  presente: boolean;
  nota?: string | null;
};

type FormState = {
  nombre: string;
  apellido: string;
  telefono: string;
  disciplina: string;
  activo: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS_CORTO = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function hoyISO() {
  const hoy = new Date();
  return new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function iniciales(p: Profesor) {
  return `${p.apellido.charAt(0)}${p.nombre.charAt(0)}`.toUpperCase();
}

function porcentaje(presente: number, total: number) {
  if (total === 0) return 0;
  return Math.round((presente / total) * 100);
}

// ─── Componente principal ─────────────────────────────────────
export default function ProfesoresPage() {
  const [tab, setTab] = useState<"hoy" | "historial" | "abm">("hoy");

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Historial filters
  const hoy = new Date();
  const hoyStrActual = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [mesFiltro, setMesFiltro] = useState(hoy.getMonth());
  const [anioFiltro, setAnioFiltro] = useState(hoy.getFullYear());
  const [vistaHistorial, setVistaHistorial] = useState<"matriz" | "profesor" | "dia">("matriz");
  const [profesorSeleccionado, setProfesorSeleccionado] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyISO());

  // Modal ABM
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Profesor | null>(null);
  const [form, setForm] = useState<FormState>({ nombre:"",apellido:"",telefono:"",disciplina:"",activo:true });
  const [guardando, setGuardando] = useState(false);
  const [eliminandoProfesorId, setEliminandoProfesorId] = useState<string | null>(null);
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null);

  // ── Carga ──────────────────────────────────────────────────
  const fetchProfesores = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("profesores")
      .select("*")
      .order("apellido")
      .order("nombre");
    if (err) throw new Error(err.message);
    setProfesores(data ?? []);
  }, []);

  const fetchAsistencias = useCallback(async () => {
    // Traemos el mes completo del filtro activo + hoy
    const desde = `${anioFiltro}-${String(mesFiltro + 1).padStart(2,"0")}-01`;
    const diasMes = new Date(anioFiltro, mesFiltro + 1, 0).getDate();
    const hasta = `${anioFiltro}-${String(mesFiltro + 1).padStart(2,"0")}-${diasMes}`;
    const desdeConsulta = hoyStrActual < desde ? hoyStrActual : desde;
    const hastaConsulta = hoyStrActual > hasta ? hoyStrActual : hasta;

    // También traemos el día de hoy si no está en ese rango
    const { data, error: err } = await supabase
      .from("asistencia_profesores")
      .select("*")
      .gte("fecha", desdeConsulta)
      .lte("fecha", hastaConsulta);
    if (err) throw new Error(err.message);
    setAsistencias(data ?? []);
  }, [mesFiltro, anioFiltro, hoyStrActual]);

  const fetchTodo = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      await Promise.all([fetchProfesores(), fetchAsistencias()]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos cargar los datos.");
    } finally {
      setCargando(false);
    }
  }, [fetchProfesores, fetchAsistencias]);

  useEffect(() => { fetchTodo(); }, [fetchTodo]);

  // Re-fetch asistencias cuando cambia el mes
  useEffect(() => {
    fetchAsistencias().catch(() => {});
  }, [mesFiltro, anioFiltro, fetchAsistencias]);

  // ── Asistencia HOY ─────────────────────────────────────────
  const hoyStr = hoyISO();

  const asistenciaHoy = useMemo(
    () => asistencias.filter(a => a.fecha === hoyStr),
    [asistencias, hoyStr]
  );

  const getEstadoHoy = (profesorId: string): boolean | null => {
    const reg = asistenciaHoy.find(a => a.profesor_id === profesorId);
    if (!reg) return null;
    return reg.presente;
  };

  const marcarAsistencia = async (profesorId: string, presente: boolean) => {
    setLoadingBtn(profesorId);
    try {
      const result = await marcarAsistenciaProfesorAdminAction({
        profesorId,
        fecha: hoyStr,
        presente,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const asistenciaActualizada = result.data;

      if (!asistenciaActualizada) {
        throw new Error("No recibimos la asistencia actualizada.");
      }

      setAsistencias((prev) => {
        const yaExiste = prev.some((item) => item.id === asistenciaActualizada.id);

        if (yaExiste) {
          return prev.map((item) => item.id === asistenciaActualizada.id ? asistenciaActualizada : item);
        }

        return [...prev, asistenciaActualizada];
      });
    } catch (error) {
      toast.error("Error: " + (error instanceof Error ? error.message : "No pudimos guardar la asistencia."));
    } finally {
      setLoadingBtn(null);
    }
  };

  // ── Historial – datos calculados ───────────────────────────
  const diasDelMes = useMemo(() => {
    const total = new Date(anioFiltro, mesFiltro + 1, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const d = i + 1;
      const fecha = `${anioFiltro}-${String(mesFiltro + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const diaSemana = new Date(fecha + "T12:00:00").getDay();
      const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
      return { d, fecha, diaSemana, esFinDeSemana };
    });
  }, [mesFiltro, anioFiltro]);

  // Solo días de lunes a viernes (días de clase)
  const diasHabiles = useMemo(
    () => diasDelMes.filter(d => !d.esFinDeSemana),
    [diasDelMes]
  );

  const getAsistenciaMes = (profesorId: string, fecha: string): boolean | null => {
    const reg = asistencias.find(a => a.profesor_id === profesorId && a.fecha === fecha);
    if (!reg) return null;
    return reg.presente;
  };

  const statsProfesor = (profesorId: string) => {
    const registros = diasHabiles.map(d => getAsistenciaMes(profesorId, d.fecha));
    const registradas = registros.filter(r => r !== null);
    const presentes = registros.filter(r => r === true).length;
    const ausentes = registros.filter(r => r === false).length;
    const sinRegistro = diasHabiles.length - registradas.length;
    const pct = porcentaje(presentes, registradas.length);
    return { presentes, ausentes, sinRegistro, pct, totalHabiles: diasHabiles.length };
  };

  // Asistencias de un día específico
  const asistenciasDia = useMemo(() => {
    return asistencias.filter(a => a.fecha === diaSeleccionado);
  }, [asistencias, diaSeleccionado]);

  // ── ABM ────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre:"",apellido:"",telefono:"",disciplina:"",activo:true });
    setModalOpen(true);
  };

  const abrirEditar = (p: Profesor) => {
    setEditando(p);
    setForm({ nombre: p.nombre, apellido: p.apellido, telefono: p.telefono ?? "", disciplina: p.disciplina, activo: p.activo });
    setModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const result = await guardarProfesorAdminAction({
        id: editando?.id,
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        disciplina: form.disciplina,
        activo: form.activo,
      });

      if (!result.success) throw new Error(result.error);

      await fetchProfesores();
      setModalOpen(false);
    } catch (error) {
      toast.error("Error: " + (error instanceof Error ? error.message : "No pudimos guardar el profesor."));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarProfesor = async () => {
    if (!editando?.id) return;

    const nombreCompleto = `${editando.nombre} ${editando.apellido}`.trim();
    const confirmar = window.confirm(
      `Se va a eliminar a ${nombreCompleto || "este profesor"} y tambien su historial de asistencia. Esta accion no se puede deshacer.`
    );

    if (!confirmar) return;

    setEliminandoProfesorId(editando.id);
    try {
      const result = await eliminarProfesorAdminAction(editando.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      setProfesores((prev) => prev.filter((item) => item.id !== editando.id));
      setAsistencias((prev) => prev.filter((item) => item.profesor_id !== editando.id));

      if (profesorSeleccionado === editando.id) {
        setProfesorSeleccionado(null);
      }

      setModalOpen(false);
      setEditando(null);
      toast.success("Profesor eliminado.");
    } catch (error) {
      toast.error("Error: " + (error instanceof Error ? error.message : "No pudimos eliminar el profesor."));
    } finally {
      setEliminandoProfesorId(null);
    }
  };

  const toggleActivo = async (p: Profesor) => {
    const result = await toggleProfesorActivoAdminAction(p.id, !p.activo);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setProfesores(prev => prev.map(x => x.id === p.id ? { ...x, activo: !p.activo } : x));
  };

  // ── Stats globales HOY ─────────────────────────────────────
  const activos = profesores.filter(p => p.activo);
  const presentesHoy = asistenciaHoy.filter(a => a.presente).length;
  const ausentesHoy = asistenciaHoy.filter(a => !a.presente).length;
  const sinRegistrarHoy = activos.length - asistenciaHoy.length;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="font-dm-sans min-h-screen">

      {/* ── HEADER ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-playfair text-[1.8rem] font-semibold text-[#1A1A22]">
            Profesores <em className="italic text-[#C97A96]">& Asistencia</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-0.5">
            {activos.length} activos · Hoy: {presentesHoy} presentes · {ausentesHoy} ausentes
            {sinRegistrarHoy > 0 && ` · ${sinRegistrarHoy} sin registrar`}
          </p>
        </div>
        <button onClick={abrirNuevo} className="rounded-full bg-[#C97A96] px-5 py-2.5 text-[0.82rem] font-semibold text-white shadow-md transition-all hover:bg-[#1A1A22] sm:w-auto">
          + Nuevo profesor
        </button>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-5 py-4 text-sm flex gap-3">
          <span>⚠️</span>
          <div>
            <strong className="block mb-1">Error al cargar datos</strong>
            <p className="text-xs">{error}</p>
            <button onClick={fetchTodo} className="mt-1.5 text-xs font-bold underline">Reintentar</button>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="mb-6 flex w-full gap-1 overflow-x-auto rounded-2xl border border-[#E8A0B4]/15 bg-[#F7F7F9] p-1">
        {([
          { id: "hoy",       label: "📋 Asistencia de Hoy" },
          { id: "historial", label: "📊 Historial" },
          { id: "abm",       label: "👤 Profesores" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-[0.82rem] font-semibold transition-all ${
              tab === t.id
                ? "bg-white text-[#C97A96] shadow-sm border border-[#E8A0B4]/20"
                : "text-[#8A8A99] hover:text-[#4A4A55]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB: ASISTENCIA DE HOY
      ════════════════════════════════════════ */}
      {tab === "hoy" && (
        <div>
          {cargando ? (
            <SkeletonRows n={4} />
          ) : activos.length === 0 ? (
            <EmptyState mensaje="No hay profesores activos." onAgregar={abrirNuevo} />
          ) : (
            <>
              {/* Resumen rápido */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Presentes", valor: presentesHoy,    color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                  { label: "Ausentes",  valor: ausentesHoy,     color: "text-red-500",     bg: "bg-red-50",     border: "border-red-100"     },
                  { label: "Sin marcar",valor: sinRegistrarHoy, color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-100"   },
                ].map(m => (
                  <div key={m.label} className={`${m.bg} border ${m.border} rounded-2xl px-5 py-4 flex items-center justify-between`}>
                    <span className="text-[0.75rem] font-bold text-[#8A8A99] uppercase tracking-wide">{m.label}</span>
                    <span className={`text-2xl font-bold ${m.color}`}>{m.valor}</span>
                  </div>
                ))}
              </div>

              {/* Lista de profesores */}
              <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
                {activos.map((p, idx) => {
                  const estado = getEstadoHoy(p.id);
                  const loading = loadingBtn === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`flex flex-wrap items-start gap-3 px-4 py-4 transition-colors sm:flex-nowrap sm:items-center sm:px-5 ${
                        idx < activos.length - 1 ? "border-b border-gray-50" : ""
                      } ${
                        estado === true  ? "bg-emerald-50/40" :
                        estado === false ? "bg-red-50/30" : ""
                      }`}
                    >
                      {/* Avatar con indicador */}
                      <div className="relative shrink-0">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                          estado === true  ? "bg-emerald-100 text-emerald-700" :
                          estado === false ? "bg-red-100 text-red-500" :
                          "bg-[#FDF0F4] text-[#C97A96]"
                        }`}>
                          {iniciales(p)}
                        </div>
                        {estado !== null && (
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] ${
                            estado ? "bg-emerald-500" : "bg-red-400"
                          }`}>
                            {estado ? "✓" : "✕"}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.9rem] font-semibold text-[#1A1A22]">
                          {p.apellido}, {p.nombre}
                        </p>
                        <p className="text-[0.75rem] text-[#8A8A99]">{p.disciplina}</p>
                      </div>

                      {/* Estado label */}
                      <div className="shrink-0 hidden sm:block">
                        <span className={`text-[0.72rem] font-bold px-3 py-1 rounded-full ${
                          estado === true  ? "bg-emerald-100 text-emerald-700" :
                          estado === false ? "bg-red-100 text-red-500" :
                          "bg-gray-100 text-gray-400"
                        }`}>
                          {estado === true ? "Presente" : estado === false ? "Ausente" : "Sin registrar"}
                        </span>
                      </div>

                      {/* Botones */}
                      <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                        <button
                          disabled={loading || estado === true}
                          onClick={() => marcarAsistencia(p.id, true)}
                          className={`px-4 py-2 rounded-xl text-[0.78rem] font-bold transition-all disabled:cursor-not-allowed ${
                            estado === true
                              ? "bg-emerald-500 text-white shadow-sm cursor-default"
                              : "bg-gray-100 text-gray-500 hover:bg-emerald-500 hover:text-white disabled:opacity-40"
                          }`}
                        >
                          {loading ? "..." : "✓ Presente"}
                        </button>
                        <button
                          disabled={loading || estado === false}
                          onClick={() => marcarAsistencia(p.id, false)}
                          className={`px-4 py-2 rounded-xl text-[0.78rem] font-bold transition-all disabled:cursor-not-allowed ${
                            estado === false
                              ? "bg-red-400 text-white shadow-sm cursor-default"
                              : "bg-gray-100 text-gray-500 hover:bg-red-400 hover:text-white disabled:opacity-40"
                          }`}
                        >
                          {loading ? "..." : "✕ Ausente"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nota al pie */}
              <p className="text-[0.72rem] text-[#8A8A99] text-center mt-4">
                Los cambios se guardan automáticamente · Podés modificar el registro en cualquier momento
              </p>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: HISTORIAL
      ════════════════════════════════════════ */}
      {tab === "historial" && (
        <div>
          {/* Controles de filtro */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Selector de mes */}
            <div className="flex items-center gap-1 bg-white border border-[#E8A0B4]/20 rounded-xl px-1 py-1 shadow-sm">
              <button
                onClick={() => {
                  if (mesFiltro === 0) { setMesFiltro(11); setAnioFiltro(a => a - 1); }
                  else setMesFiltro(m => m - 1);
                }}
                className="w-8 h-8 rounded-lg text-[#8A8A99] hover:bg-[#FDF0F4] hover:text-[#C97A96] transition-colors text-sm font-bold"
              >‹</button>
              <span className="text-[0.85rem] font-semibold text-[#1A1A22] px-2 min-w-[140px] text-center">
                {MESES[mesFiltro]} {anioFiltro}
              </span>
              <button
                onClick={() => {
                  if (mesFiltro === 11) { setMesFiltro(0); setAnioFiltro(a => a + 1); }
                  else setMesFiltro(m => m + 1);
                }}
                className="w-8 h-8 rounded-lg text-[#8A8A99] hover:bg-[#FDF0F4] hover:text-[#C97A96] transition-colors text-sm font-bold"
              >›</button>
            </div>

            {/* Sub-vistas */}
            <div className="flex gap-1 bg-[#F7F7F9] p-1 rounded-xl border border-[#E8A0B4]/15">
              {([
                { id: "matriz",   label: "Grilla mensual" },
                { id: "profesor", label: "Por profesor" },
                { id: "dia",      label: "Por día" },
              ] as const).map(v => (
                <button
                  key={v.id}
                  onClick={() => setVistaHistorial(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold transition-all ${
                    vistaHistorial === v.id
                      ? "bg-white text-[#C97A96] shadow-sm border border-[#E8A0B4]/20"
                      : "text-[#8A8A99] hover:text-[#4A4A55]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {cargando ? <SkeletonRows n={5} /> : (
            <>
              {/* ── Vista: MATRIZ MENSUAL ── */}
              {vistaHistorial === "matriz" && (
                <div>
                  {profesores.filter(p => p.activo).length === 0 ? (
                    <EmptyState mensaje="No hay profesores activos." onAgregar={abrirNuevo} />
                  ) : (
                    <>
                      {/* Leyenda */}
                      <div className="flex items-center gap-4 mb-4 flex-wrap">
                        <span className="text-[0.72rem] font-bold text-[#8A8A99] uppercase tracking-wide">Referencia:</span>
                        {[
                          { color: "bg-emerald-400", label: "Presente" },
                          { color: "bg-red-400",     label: "Ausente" },
                          { color: "bg-gray-200",    label: "Sin registro" },
                          { color: "bg-[#F7F7F9] border border-dashed border-gray-300", label: "Fin de semana" },
                        ].map(l => (
                          <div key={l.label} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded ${l.color}`} />
                            <span className="text-[0.72rem] text-[#8A8A99]">{l.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Tabla - scrollable horizontalmente */}
                      <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse" style={{ minWidth: `${120 + diasDelMes.length * 32}px` }}>
                            <thead>
                              <tr className="bg-[#F7F7F9]">
                                {/* Columna nombre */}
                                <th className="sticky left-0 z-10 bg-[#F7F7F9] text-left text-[0.68rem] font-bold uppercase tracking-[1px] text-[#8A8A99] px-4 py-3 border-b border-r border-[#E8A0B4]/20 min-w-[160px]">
                                  Profesor
                                </th>
                                {/* Columnas días */}
                                {diasDelMes.map(({ d, diaSemana, esFinDeSemana }) => (
                                  <th
                                    key={d}
                                    className={`text-center text-[0.62rem] font-bold py-2 border-b border-[#E8A0B4]/10 w-8 ${
                                      esFinDeSemana ? "text-gray-300 bg-gray-50/50" : "text-[#8A8A99]"
                                    }`}
                                  >
                                    <div>{DIAS_CORTO[diaSemana].charAt(0)}</div>
                                    <div className={`text-[0.7rem] font-bold mt-0.5 ${esFinDeSemana ? "text-gray-300" : "text-[#1A1A22]"}`}>{d}</div>
                                  </th>
                                ))}
                                {/* Columna stats */}
                                <th className="sticky right-0 z-10 bg-[#F7F7F9] text-center text-[0.68rem] font-bold uppercase tracking-[1px] text-[#8A8A99] px-4 py-3 border-b border-l border-[#E8A0B4]/20 min-w-[100px]">
                                  % Asist.
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {profesores.filter(p => p.activo).map((p, rowIdx) => {
                                const stats = statsProfesor(p.id);
                                return (
                                  <tr
                                    key={p.id}
                                    className={`transition-colors hover:bg-[#FDF0F4]/20 ${rowIdx % 2 === 1 ? "bg-[#F7F7F9]/30" : ""}`}
                                  >
                                    {/* Nombre */}
                                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-r border-[#E8A0B4]/10">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-[#FDF0F4] text-[#C97A96] flex items-center justify-center text-[0.65rem] font-bold shrink-0">
                                          {iniciales(p)}
                                        </div>
                                        <div>
                                          <p className="text-[0.8rem] font-semibold text-[#1A1A22] whitespace-nowrap">{p.apellido}, {p.nombre}</p>
                                          <p className="text-[0.68rem] text-[#8A8A99]">{p.disciplina}</p>
                                        </div>
                                      </div>
                                    </td>
                                    {/* Celdas de días */}
                                    {diasDelMes.map(({ d, fecha, esFinDeSemana }) => {
                                      const estado = getAsistenciaMes(p.id, fecha);
                                      const esFuturo = fecha > hoyStr;
                                      return (
                                        <td key={d} className="p-0.5">
                                          <div
                                            className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center text-[0.6rem] font-bold transition-all ${
                                              esFinDeSemana
                                                ? "bg-transparent border border-dashed border-gray-100"
                                                : esFuturo
                                                ? "bg-gray-50"
                                                : estado === true
                                                ? "bg-emerald-400 text-white"
                                                : estado === false
                                                ? "bg-red-400 text-white"
                                                : "bg-gray-100 text-gray-300"
                                            }`}
                                          >
                                            {esFinDeSemana ? "" : esFuturo ? "" : estado === true ? "✓" : estado === false ? "✕" : "·"}
                                          </div>
                                        </td>
                                      );
                                    })}
                                    {/* Stats */}
                                    <td className="sticky right-0 z-10 bg-inherit px-4 py-2.5 border-l border-[#E8A0B4]/10 text-center">
                                      <div className={`text-[0.85rem] font-bold ${
                                        stats.pct >= 80 ? "text-emerald-600" :
                                        stats.pct >= 60 ? "text-amber-500" : "text-red-500"
                                      }`}>
                                        {stats.presentes + stats.ausentes === 0 ? "—" : `${stats.pct}%`}
                                      </div>
                                      <div className="text-[0.62rem] text-[#8A8A99]">
                                        {stats.presentes}P / {stats.ausentes}A
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Footer resumen */}
                        <div className="px-5 py-3 bg-[#F7F7F9]/60 border-t border-[#E8A0B4]/15 flex flex-wrap gap-4">
                          {(() => {
                            const todos = profesores.filter(p => p.activo);
                            const totalPresentes = todos.reduce((acc, p) => acc + statsProfesor(p.id).presentes, 0);
                            const totalAusentes  = todos.reduce((acc, p) => acc + statsProfesor(p.id).ausentes, 0);
                            const pctGeneral = porcentaje(totalPresentes, totalPresentes + totalAusentes);
                            const mejor = [...todos].sort((a, b) => statsProfesor(b.id).pct - statsProfesor(a.id).pct)[0];
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-[0.72rem] text-[#8A8A99]">Asistencia general del mes:</span>
                                  <span className={`text-[0.8rem] font-bold ${pctGeneral >= 80 ? "text-emerald-600" : pctGeneral >= 60 ? "text-amber-500" : "text-red-500"}`}>
                                    {pctGeneral}%
                                  </span>
                                </div>
                                {mejor && statsProfesor(mejor.id).presentes > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[0.72rem] text-[#8A8A99]">Mayor asistencia:</span>
                                    <span className="text-[0.8rem] font-bold text-emerald-600">
                                      {mejor.apellido}, {mejor.nombre} ({statsProfesor(mejor.id).pct}%)
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Vista: POR PROFESOR ── */}
              {vistaHistorial === "profesor" && (
                <div>
                  {/* Selector de profesor */}
                  <div className="mb-5">
                    <label className="block text-[0.72rem] font-bold text-[#8A8A99] uppercase tracking-wide mb-2">
                      Seleccionar profesor
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {profesores.filter(p => p.activo).map(p => (
                        <button
                          key={p.id}
                          onClick={() => setProfesorSeleccionado(p.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[0.8rem] font-semibold transition-all ${
                            profesorSeleccionado === p.id
                              ? "bg-[#C97A96] text-white border-[#C97A96] shadow-sm"
                              : "bg-white text-[#4A4A55] border-[#E8A0B4]/30 hover:border-[#C97A96]"
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[0.6rem] font-bold">
                            {iniciales(p)}
                          </span>
                          {p.apellido}, {p.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  {profesorSeleccionado ? (() => {
                    const prof = profesores.find(p => p.id === profesorSeleccionado)!;
                    const stats = statsProfesor(profesorSeleccionado);
                    const historialProf = diasHabiles.map(d => ({
                      ...d,
                      estado: getAsistenciaMes(profesorSeleccionado, d.fecha),
                    }));

                    return (
                      <div className="space-y-4">
                        {/* Stats del profesor */}
                        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-6 shadow-sm">
                          <div className="flex items-start gap-4 mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-[#FDF0F4] text-[#C97A96] flex items-center justify-center font-bold text-lg">
                              {iniciales(prof)}
                            </div>
                            <div>
                              <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">
                                {prof.apellido}, {prof.nombre}
                              </h3>
                              <p className="text-[0.8rem] text-[#8A8A99]">{prof.disciplina}</p>
                            </div>
                            <div className="ml-auto text-right">
                              <div className={`text-3xl font-bold ${stats.pct >= 80 ? "text-emerald-600" : stats.pct >= 60 ? "text-amber-500" : "text-red-500"}`}>
                                {stats.presentes + stats.ausentes === 0 ? "—" : `${stats.pct}%`}
                              </div>
                              <div className="text-[0.72rem] text-[#8A8A99]">asistencia {MESES[mesFiltro]}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {[
                              { label: "Presentes",    valor: stats.presentes,    color: "text-emerald-600", bg: "bg-emerald-50" },
                              { label: "Ausentes",     valor: stats.ausentes,     color: "text-red-500",     bg: "bg-red-50"     },
                              { label: "Sin registrar",valor: stats.sinRegistro,  color: "text-amber-600",   bg: "bg-amber-50"   },
                            ].map(m => (
                              <div key={m.label} className={`${m.bg} rounded-xl p-3 text-center`}>
                                <div className={`text-xl font-bold ${m.color}`}>{m.valor}</div>
                                <div className="text-[0.68rem] text-[#8A8A99] font-medium">{m.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Barra de progreso */}
                          {stats.presentes + stats.ausentes > 0 && (
                            <div className="mt-4">
                              <div className="flex justify-between text-[0.68rem] text-[#8A8A99] mb-1">
                                <span>Días registrados: {stats.presentes + stats.ausentes} de {stats.totalHabiles}</span>
                                <span>{stats.pct}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${stats.pct >= 80 ? "bg-emerald-400" : stats.pct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{ width: `${stats.pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Detalle día por día */}
                        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
                          <div className="px-5 py-3.5 border-b border-[#E8A0B4]/15 bg-[#F7F7F9]/50">
                            <h4 className="text-[0.85rem] font-semibold text-[#1A1A22]">Detalle de {MESES[mesFiltro]} {anioFiltro}</h4>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {historialProf.length === 0 ? (
                              <p className="px-5 py-4 text-sm text-[#8A8A99]">No hay días hábiles en este período.</p>
                            ) : historialProf.map(dia => {
                              const fechaObj = new Date(dia.fecha + "T12:00:00");
                              const esFuturo = dia.fecha > hoyStr;
                              return (
                                <div key={dia.fecha} className="flex items-center gap-4 px-5 py-3">
                                  <div className="w-10 text-center">
                                    <div className="text-[0.65rem] font-bold text-[#8A8A99] uppercase">{DIAS_CORTO[fechaObj.getDay()]}</div>
                                    <div className="text-[0.95rem] font-bold text-[#1A1A22]">{dia.d}</div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-[0.8rem] text-[#4A4A55]">
                                      {fechaObj.toLocaleDateString("es-AR", { day:"numeric", month:"long", year:"numeric" })}
                                    </div>
                                  </div>
                                  {esFuturo ? (
                                    <span className="text-[0.72rem] text-gray-300 font-medium">Próximo</span>
                                  ) : (
                                    <span className={`text-[0.72rem] font-bold px-3 py-1 rounded-full ${
                                      dia.estado === true  ? "bg-emerald-100 text-emerald-700" :
                                      dia.estado === false ? "bg-red-100 text-red-500" :
                                      "bg-gray-100 text-gray-400"
                                    }`}>
                                      {dia.estado === true ? "✓ Presente" : dia.estado === false ? "✕ Ausente" : "— Sin registro"}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center h-40 text-[#8A8A99] bg-white border border-dashed border-[#E8A0B4]/30 rounded-2xl">
                      <span className="text-3xl mb-2">👆</span>
                      <p className="text-sm">Seleccioná un profesor para ver su historial</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Vista: POR DÍA ── */}
              {vistaHistorial === "dia" && (
                <div>
                  <div className="mb-5">
                    <label className="block text-[0.72rem] font-bold text-[#8A8A99] uppercase tracking-wide mb-2">
                      Seleccionar día
                    </label>
                    <input
                      type="date"
                      value={diaSeleccionado}
                      onChange={e => {
                        setDiaSeleccionado(e.target.value);
                        // Si el día está fuera del mes actual del filtro, actualizamos el mes
                        const d = new Date(e.target.value + "T12:00:00");
                        setMesFiltro(d.getMonth());
                        setAnioFiltro(d.getFullYear());
                      }}
                      className="border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all bg-white"
                    />
                  </div>

                  {(() => {
                    const fechaObj = new Date(diaSeleccionado + "T12:00:00");
                    const esFinde = fechaObj.getDay() === 0 || fechaObj.getDay() === 6;
                    const presentesDia = asistenciasDia.filter(a => a.presente).length;
                    const ausentesDia = asistenciasDia.filter(a => !a.presente).length;
                    const sinReg = activos.length - asistenciasDia.length;

                    return (
                      <div className="space-y-4">
                        {/* Header del día */}
                        <div className="bg-[#1A1A22] text-white rounded-2xl px-6 py-5 flex items-center justify-between">
                          <div>
                            <p className="text-[0.72rem] font-bold text-[#E8A0B4] uppercase tracking-widest mb-1">
                              {DIAS_CORTO[fechaObj.getDay()]} {fechaObj.getDate()} de {MESES[fechaObj.getMonth()]} {fechaObj.getFullYear()}
                            </p>
                            <p className="text-white/50 text-[0.8rem]">
                              {esFinde ? "Fin de semana — sin clases programadas" :
                               diaSeleccionado > hoyStr ? "Día futuro" :
                               diaSeleccionado === hoyStr ? "Hoy" : "Registro histórico"}
                            </p>
                          </div>
                          {!esFinde && (
                            <div className="flex gap-4 text-right">
                              <div>
                                <div className="text-2xl font-bold text-emerald-400">{presentesDia}</div>
                                <div className="text-[0.65rem] text-white/40 uppercase">Presentes</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-red-400">{ausentesDia}</div>
                                <div className="text-[0.65rem] text-white/40 uppercase">Ausentes</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-amber-400">{sinReg}</div>
                                <div className="text-[0.65rem] text-white/40 uppercase">Sin reg.</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {!esFinde && (
                          <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
                            {activos.map((p, idx) => {
                              const reg = asistenciasDia.find(a => a.profesor_id === p.id);
                              const estado = reg ? reg.presente : null;
                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center gap-4 px-5 py-4 ${idx < activos.length - 1 ? "border-b border-gray-50" : ""}`}
                                >
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                    estado === true  ? "bg-emerald-100 text-emerald-700" :
                                    estado === false ? "bg-red-100 text-red-400" :
                                    "bg-[#FDF0F4] text-[#C97A96]"
                                  }`}>
                                    {iniciales(p)}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-[0.88rem] font-semibold text-[#1A1A22]">{p.apellido}, {p.nombre}</p>
                                    <p className="text-[0.75rem] text-[#8A8A99]">{p.disciplina}</p>
                                  </div>
                                  <span className={`text-[0.72rem] font-bold px-3 py-1.5 rounded-full border ${
                                    estado === true  ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                    estado === false ? "bg-red-50 text-red-500 border-red-100" :
                                    "bg-gray-50 text-gray-400 border-gray-100"
                                  }`}>
                                    {estado === true ? "✓ Presente" : estado === false ? "✕ Ausente" : "— Sin registro"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: ABM PROFESORES
      ════════════════════════════════════════ */}
      {tab === "abm" && (
        <div>
          {cargando ? (
            <SkeletonRows n={4} />
          ) : profesores.length === 0 ? (
            <EmptyState mensaje="Todavía no hay profesores." onAgregar={abrirNuevo} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E8A0B4]/20 bg-white shadow-sm">
              {/* Header */}
              <div className="grid min-w-[560px] grid-cols-[44px_1fr_180px_80px_100px] border-b border-[#E8A0B4]/20 bg-[#F7F7F9] px-5 py-3">
                <div />
                {["Profesor", "Disciplina", "Estado", "Acciones"].map(h => (
                  <div key={h} className="text-[0.65rem] font-black uppercase tracking-[1.5px] text-[#8A8A99]">{h}</div>
                ))}
              </div>

              {/* Filas */}
              {profesores.map((p, idx) => (
                <div
                  key={p.id}
                  className={`grid min-w-[560px] grid-cols-[44px_1fr_180px_80px_100px] items-center px-5 py-3.5 transition-colors hover:bg-[#FDF0F4]/20 ${
                    idx < profesores.length - 1 ? "border-b border-gray-50" : ""
                  } ${!p.activo ? "opacity-50" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    p.activo ? "bg-[#FDF0F4] text-[#C97A96]" : "bg-gray-100 text-gray-400"
                  }`}>
                    {iniciales(p)}
                  </div>
                  <div>
                    <p className="text-[0.88rem] font-semibold text-[#1A1A22]">{p.apellido}, {p.nombre}</p>
                    <p className="text-[0.72rem] text-[#8A8A99]">{p.telefono || "Sin teléfono"}</p>
                  </div>
                  <p className="text-[0.82rem] text-[#4A4A55]">{p.disciplina}</p>
                  <div>
                    <button
                      onClick={() => toggleActivo(p)}
                      className={`text-[0.68rem] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        p.activo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100"
                          : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100"
                      }`}
                      title={p.activo ? "Clic para desactivar" : "Clic para activar"}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-[0.78rem] text-[#C97A96] font-semibold hover:underline"
                    >
                      Editar →
                    </button>
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div className="px-5 py-3 bg-[#F7F7F9]/50 border-t border-[#E8A0B4]/15">
                <span className="text-[0.72rem] text-[#8A8A99]">
                  {profesores.length} profesores · {activos.length} activos · {profesores.length - activos.length} inactivos
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">
                {editando ? "Editar profesor" : "Nuevo profesor"}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[#C97A96] hover:text-[#1A1A22] text-xl">✕</button>
            </div>
            <form onSubmit={handleGuardar} className="max-h-[calc(90vh-88px)] overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[0.7rem] font-bold text-[#8A8A99] uppercase tracking-wide mb-1">Nombre *</label>
                  <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] transition-all" placeholder="Laura" />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold text-[#8A8A99] uppercase tracking-wide mb-1">Apellido *</label>
                  <input required value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}
                    className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] transition-all" placeholder="Gómez" />
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold text-[#8A8A99] uppercase tracking-wide mb-1">Disciplina *</label>
                <input required value={form.disciplina} onChange={e => setForm({...form, disciplina: e.target.value})}
                  className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] transition-all" placeholder="Ej: Jazz, Ballet, Contemporáneo..." />
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold text-[#8A8A99] uppercase tracking-wide mb-1">Teléfono</label>
                <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                  className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] transition-all" placeholder="3512345678" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-[#FDF0F4]/50 border border-transparent hover:border-[#E8A0B4]/20 transition-all">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="w-4 h-4 accent-[#C97A96]" />
                <span className="text-sm text-[#4A4A55] font-medium">Profesor activo</span>
              </label>
              <div className="flex gap-3 pt-1">
                {editando && (
                  <button
                    type="button"
                    onClick={handleEliminarProfesor}
                    disabled={guardando || eliminandoProfesorId === editando.id}
                    className="bg-red-50 text-red-600 py-3 px-4 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                  >
                    {eliminandoProfesorId === editando.id ? "Eliminando..." : "Eliminar"}
                  </button>
                )}
                <button type="button" onClick={() => setModalOpen(false)}
                  disabled={guardando || Boolean(eliminandoProfesorId)}
                  className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all disabled:opacity-50">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando || Boolean(eliminandoProfesorId)}
                  className="flex-[2] bg-[#C97A96] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50">
                  {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear profesor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────
function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8A0B4]/20 overflow-hidden shadow-sm">
      {[...Array(n)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 animate-pulse last:border-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded w-40" />
            <div className="h-3 bg-gray-50 rounded w-24" />
          </div>
          <div className="h-8 bg-gray-100 rounded-xl w-24" />
          <div className="h-8 bg-gray-100 rounded-xl w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ mensaje, onAgregar }: { mensaje: string; onAgregar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-52 bg-white border border-dashed border-[#E8A0B4]/30 rounded-2xl text-[#8A8A99]">
      <span className="text-4xl mb-3">🧑‍🏫</span>
      <p className="text-sm font-medium">{mensaje}</p>
      <button onClick={onAgregar} className="mt-3 text-[#C97A96] text-xs font-bold hover:underline">+ Agregar el primero</button>
    </div>
  );
}
