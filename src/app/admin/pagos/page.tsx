"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { mesActualStr } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────
type Perfil = { id: string; nombre: string; apellido: string };

type Pago = {
  id: string;
  alumna_id: string;
  monto: number;
  fecha_pago: string;
  mes_correspondiente: string;
  metodo_pago: string;
  estado: string;
  nota: string | null;
  perfiles?: { nombre: string; apellido: string };
};

// ─── Constantes ───────────────────────────────────────────────
const METODOS = ["Efectivo", "Transferencia", "MercadoPago", "Otro"];
const MESES_NOMBRE = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function getMetodoIcon(m: string) {
  if (m === "Efectivo") return "💵";
  if (m === "Transferencia") return "🏦";
  if (m === "MercadoPago") return "📱";
  return "💳";
}

// ─────────────────────────────────────────────────────────────
export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const mesHoy = mesActualStr();
  const [filtroMes, setFiltroMes] = useState("Todos");

  const formVacio = {
    alumna_id: "",
    monto: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    mes_correspondiente: mesHoy,
    metodo_pago: "Efectivo",
    nota: "",
  };
  const [form, setForm] = useState(formVacio);

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setCargando(true);
    const [{ data: pagosData }, { data: perfilesData }] = await Promise.all([
      supabase
        .from("pagos")
        .select("*, perfiles(nombre, apellido)")
        .order("fecha_pago", { ascending: false }),
      supabase
        .from("perfiles")
        .select("id, nombre, apellido")
        .order("nombre"),
    ]);
    if (pagosData) setPagos(pagosData);
    if (perfilesData) setPerfiles(perfilesData);
    setCargando(false);
  }

  // ── Guardar pago ───────────────────────────────────────────
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const { error } = await supabase.from("pagos").insert([
      { ...form, monto: parseFloat(form.monto), estado: "pagado" },
    ]);
    if (!error) {
      await fetchData();
      setIsModalOpen(false);
      setForm(formVacio);
    } else {
      toast.error("Error al guardar: " + error.message);
    }
    setGuardando(false);
  };

  // ── Métricas ───────────────────────────────────────────────
  const pagosMes = useMemo(
    () => pagos.filter((p) => p.mes_correspondiente === mesHoy),
    [pagos, mesHoy]
  );
  const totalRecaudado = pagosMes.reduce((acc, p) => acc + p.monto, 0);
  const alumnasPagaronIds = useMemo(
    () => new Set(pagosMes.map((p) => p.alumna_id)),
    [pagosMes]
  );
  const alumnasPendientes = useMemo(
    () => perfiles.filter((p) => !alumnasPagaronIds.has(p.id)),
    [perfiles, alumnasPagaronIds]
  );

  // ── Filtro por mes ─────────────────────────────────────────
  const mesesUnicos = useMemo(
    () => ["Todos", ...Array.from(new Set(pagos.map((p) => p.mes_correspondiente)))],
    [pagos]
  );
  const pagosFiltrados = useMemo(
    () => (filtroMes === "Todos" ? pagos : pagos.filter((p) => p.mes_correspondiente === filtroMes)),
    [pagos, filtroMes]
  );

  // ─── JSX ──────────────────────────────────────────────────
  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Pagos</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            {mesHoy} · {pagosMes.length} cobros registrados
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#C97A96] text-white rounded-full px-5 py-2.5 text-[0.82rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md shadow-[#C97A96]/20"
        >
          + Registrar Pago
        </button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
          <div className="text-[1.3rem] mb-2">💰</div>
          <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">
            Recaudado este mes
          </div>
          <div className="text-[1.8rem] font-semibold text-[#1A1A22] leading-none mb-1.5">
            ${totalRecaudado.toLocaleString("es-AR")}
          </div>
          <div className="text-[0.75rem] text-[#2DB87A] font-medium">
            {pagosMes.length} pagos
          </div>
        </div>

        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
          <div className="text-[1.3rem] mb-2">✅</div>
          <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">
            Alumnas al día
          </div>
          <div className="text-[1.8rem] font-semibold text-[#2DB87A] leading-none mb-1.5">
            {alumnasPagaronIds.size}
          </div>
          <div className="text-[0.75rem] text-[#8A8A99]">de {perfiles.length} total</div>
        </div>

        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
          <div className="text-[1.3rem] mb-2">⏳</div>
          <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">
            Pendientes
          </div>
          <div className="text-[1.8rem] font-semibold text-[#F59E0B] leading-none mb-1.5">
            {alumnasPendientes.length}
          </div>
          <div className="text-[0.75rem] text-[#F59E0B] font-medium">
            sin pagar este mes
          </div>
        </div>
      </div>

      {/* CHIP RÁPIDO: PENDIENTES */}
      {alumnasPendientes.length > 0 && (
        <div className="bg-[#FFF8E7] border border-[#F59E0B]/20 rounded-2xl p-5 mb-7">
          <h3 className="text-[0.75rem] font-bold text-[#b07800] uppercase tracking-wide mb-3">
            ⏳ Sin registrar pago en {mesHoy}
          </h3>
          <div className="flex flex-wrap gap-2">
            {alumnasPendientes.slice(0, 12).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setForm((f) => ({ ...f, alumna_id: p.id }));
                  setIsModalOpen(true);
                }}
                className="bg-white border border-[#F59E0B]/30 text-[#b07800] px-3 py-1.5 rounded-full text-[0.75rem] font-medium hover:bg-[#FFF3CD] transition-colors"
              >
                {p.nombre} {p.apellido}
              </button>
            ))}
            {alumnasPendientes.length > 12 && (
              <span className="text-[0.75rem] text-[#8A8A99] self-center">
                +{alumnasPendientes.length - 12} más
              </span>
            )}
          </div>
        </div>
      )}

      {/* FILTROS DE MES */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {mesesUnicos.map((m) => (
          <button
            key={m}
            onClick={() => setFiltroMes(m)}
            className={`px-4 py-1.5 rounded-full border-[1.5px] text-[0.8rem] font-medium whitespace-nowrap transition-all ${
              filtroMes === m
                ? "bg-[#C97A96] text-white border-[#C97A96]"
                : "bg-white text-[#4A4A55] border-[#E8A0B4]/30 hover:border-[#C97A96]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* TABLA */}
      <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[300px]">
          {cargando ? (
            <div className="flex items-center justify-center h-[300px] text-[#8A8A99] text-sm font-medium">
              Cargando pagos...
            </div>
          ) : pagosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-[#8A8A99]">
              <div className="text-4xl mb-3">💸</div>
              <p className="text-sm font-medium">No hay pagos registrados</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F7F7F9]">
                  {["Alumna", "Mes", "Monto", "Método", "Fecha pago", "Nota"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#E8A0B4]/10 last:border-0 hover:bg-[#FDF0F4]/30 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-[0.85rem] text-[#1A1A22]">
                        {p.perfiles?.nombre} {p.perfiles?.apellido}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[0.83rem] text-[#4A4A55] whitespace-nowrap">
                      {p.mes_correspondiente}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-[#2DB87A]">
                        ${p.monto.toLocaleString("es-AR")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[0.83rem] text-[#4A4A55] whitespace-nowrap">
                      {getMetodoIcon(p.metodo_pago)} {p.metodo_pago}
                    </td>
                    <td className="px-4 py-3 text-[0.83rem] text-[#8A8A99] whitespace-nowrap">
                      {new Date(p.fecha_pago + "T00:00:00").toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-[0.83rem] text-[#8A8A99] max-w-[160px] truncate">
                      {p.nota || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">
                Registrar Pago
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setForm(formVacio); }}
                className="text-[#C97A96] hover:text-[#1A1A22] text-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                  Alumna *
                </label>
                <select
                  required
                  value={form.alumna_id}
                  onChange={(e) => setForm({ ...form, alumna_id: e.target.value })}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="">Seleccioná una alumna</option>
                  {perfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Monto ($) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="Ej: 8000"
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Método *
                  </label>
                  <select
                    value={form.metodo_pago}
                    onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                  >
                    {METODOS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Fecha de pago *
                  </label>
                  <input
                    required
                    type="date"
                    value={form.fecha_pago}
                    onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Mes correspondiente *
                  </label>
                  <input
                    required
                    placeholder="Ej: Junio 2025"
                    value={form.mes_correspondiente}
                    onChange={(e) => setForm({ ...form, mes_correspondiente: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                  Nota (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago cuota completa"
                  value={form.nota}
                  onChange={(e) => setForm({ ...form, nota: e.target.value })}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-[#C97A96] text-white py-3.5 rounded-xl font-semibold hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Registrar Pago ✓"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}