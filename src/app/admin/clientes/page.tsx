"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { invitarAlumnaAction } from "./actions";
import toast from "react-hot-toast";
import { mesActualStr, calcularEdad } from "@/lib/utils";

type Alumna = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  fecha_nacimiento: string;
  autoriza_imagen: boolean;
  apto_medico: boolean;
  fotocopia_dni: boolean;
  estado: string;
};

type PerfilPago = { id: string; nombre: string; apellido: string };

const FILTROS = ["Todas", "Activas", "Nuevas", "Pendientes Doc"];
const METODOS_PAGO = ["Efectivo", "Transferencia", "MercadoPago", "Otro"];


export default function ClientesPage() {
  const searchParams = useSearchParams();
  const [clientes, setClientes] = useState<Alumna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [filtroActivo, setFiltroActivo] = useState("Todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal inscripción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInscribir, setFormInscribir] = useState({ nombre: "", apellido: "", email: "" });

  // Modal pago rápido
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [alumnaParaPago, setAlumnaParaPago] = useState<PerfilPago | null>(null);
  const [pagoForm, setPagoForm] = useState({
    monto: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    mes_correspondiente: mesActualStr(),
    metodo_pago: "Efectivo",
    nota: "",
  });
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [enviarComprobante, setEnviarComprobante] = useState(false);

  // Modal edición alumna
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    estado: "nueva",
    fecha_inicio: "",
  });
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Modal avisos masivos
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [avisoMensaje, setAvisoMensaje] = useState("");
  const [avisando, setAvisando] = useState(false);
  const [avisoProgreso, setAvisoProgreso] = useState({ enviados: 0, total: 0 });

  useEffect(() => { fetchClientes(); }, []);

  async function fetchClientes() {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .order("apellido", { ascending: true });
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error cargando perfiles:", error);
    } finally {
      setCargando(false);
    }
  }

  const handleInscribirAlumna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await invitarAlumnaAction(formInscribir.email, formInscribir.nombre, formInscribir.apellido);
      if (result.success) {
        toast.success(`¡Invitación enviada a ${formInscribir.email}!`);
        setIsModalOpen(false);
        setFormInscribir({ nombre: "", apellido: "", email: "" });
        await fetchClientes();
      } else {
        toast.error("Error: " + result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirModalPago = (alumna: Alumna, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAlumnaParaPago({ id: alumna.id, nombre: alumna.nombre, apellido: alumna.apellido });
    setPagoForm({
      monto: "",
      fecha_pago: new Date().toISOString().split("T")[0],
      mes_correspondiente: mesActualStr(),
      metodo_pago: "Efectivo",
      nota: "",
    });
    setIsPagoModalOpen(true);
  };

  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnaParaPago || !pagoForm.monto) return;
    setGuardandoPago(true);

    // Validar pago duplicado
    const { data: pagoExistente } = await supabase
      .from("pagos")
      .select("id")
      .eq("alumna_id", alumnaParaPago.id)
      .eq("mes_correspondiente", pagoForm.mes_correspondiente)
      .maybeSingle();

    if (pagoExistente) {
      const confirmar = window.confirm(
        `⚠️ ${alumnaParaPago.nombre} ya tiene un pago registrado para "${pagoForm.mes_correspondiente}".\n\n¿Querés registrar otro pago de todas formas?`
      );
      if (!confirmar) {
        setGuardandoPago(false);
        return;
      }
    }

    const { error } = await supabase.from("pagos").insert([{
      alumna_id: alumnaParaPago.id,
      monto: parseFloat(pagoForm.monto),
      fecha_pago: pagoForm.fecha_pago,
      mes_correspondiente: pagoForm.mes_correspondiente,
      metodo_pago: pagoForm.metodo_pago,
      nota: pagoForm.nota || null,
      estado: "pagado",
    }]);
    setGuardandoPago(false);
    if (error) {
      toast.error("Error al registrar: " + error.message);
    } else {
      toast.success(`Pago registrado para ${alumnaParaPago.nombre}`);
      // Enviar comprobante por WhatsApp si está marcado
      if (enviarComprobante) {
        const alumna = clientes.find(c => c.id === alumnaParaPago.id);
        const tel = alumna?.telefono?.replace(/\D/g, "");
        if (tel) {
          const fechaFormateada = new Date(pagoForm.fecha_pago + "T12:00:00").toLocaleDateString("es-AR");
          const msg = encodeURIComponent(
            `✨ *Comprobante de Pago — R.G Danza* ✨\n\n` +
            `👤 *Alumna:* ${alumnaParaPago.nombre} ${alumnaParaPago.apellido}\n` +
            `💰 *Monto:* $${parseFloat(pagoForm.monto).toLocaleString("es-AR")}\n` +
            `📅 *Mes:* ${pagoForm.mes_correspondiente}\n` +
            `💳 *Método:* ${pagoForm.metodo_pago}\n` +
            `🗓️ *Fecha:* ${fechaFormateada}\n` +
            (pagoForm.nota ? `📝 *Nota:* ${pagoForm.nota}\n` : "") +
            `\n¡Gracias por ser parte de R.G Danza! 💗`
          );
          window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
        } else {
          toast.error("No se pudo enviar el comprobante: sin teléfono registrado.");
        }
      }
      setIsPagoModalOpen(false);
      setEnviarComprobante(false);
    }
  };

  // Handler edición alumna
  const abrirModalEdicion = async (alumna: Alumna, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Buscar fecha_inicio en alumna_clases
    const { data: inscripcion } = await supabase
      .from("alumna_clases")
      .select("fecha_inicio")
      .eq("alumna_id", alumna.id)
      .order("fecha_inicio", { ascending: true })
      .limit(1)
      .single();

    setEditForm({
      id: alumna.id,
      nombre: alumna.nombre || "",
      apellido: alumna.apellido || "",
      telefono: alumna.telefono || "",
      email: alumna.email || "",
      fecha_nacimiento: alumna.fecha_nacimiento || "",
      estado: alumna.estado || "nueva",
      fecha_inicio: inscripcion?.fecha_inicio || "",
    });
    setIsEditModalOpen(true);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id) return;
    setGuardandoEdit(true);

    const { error: errPerfil } = await supabase
      .from("perfiles")
      .update({
        nombre: editForm.nombre,
        apellido: editForm.apellido,
        telefono: editForm.telefono,
        email: editForm.email || null,
        fecha_nacimiento: editForm.fecha_nacimiento || null,
        estado: editForm.estado,
      })
      .eq("id", editForm.id);

    if (errPerfil) {
      toast.error("Error al guardar: " + errPerfil.message);
      setGuardandoEdit(false);
      return;
    }

    // Actualizar fecha_inicio en alumna_clases si se proporcionó
    if (editForm.fecha_inicio) {
      const { data: inscExistente } = await supabase
        .from("alumna_clases")
        .select("id")
        .eq("alumna_id", editForm.id)
        .limit(1)
        .single();

      if (inscExistente) {
        await supabase
          .from("alumna_clases")
          .update({ fecha_inicio: editForm.fecha_inicio })
          .eq("id", inscExistente.id);
      }
    }

    toast.success(`Datos de ${editForm.nombre} actualizados`);
    setIsEditModalOpen(false);
    setGuardandoEdit(false);
    await fetchClientes();
  };

  // Handler avisos masivos
  const handleEnviarAvisoMasivo = async () => {
    const alumnaConTel = clientes.filter(c => c.telefono?.replace(/\D/g, ""));
    if (alumnaConTel.length === 0) {
      toast.error("No hay alumnas con teléfono registrado.");
      return;
    }
    setAvisando(true);
    setAvisoProgreso({ enviados: 0, total: alumnaConTel.length });

    for (let i = 0; i < alumnaConTel.length; i++) {
      const tel = alumnaConTel[i].telefono.replace(/\D/g, "");
      const msgPersonalizado = avisoMensaje.replace("{nombre}", alumnaConTel[i].nombre || "");
      const msg = encodeURIComponent(msgPersonalizado);
      window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
      setAvisoProgreso({ enviados: i + 1, total: alumnaConTel.length });
      if (i < alumnaConTel.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setAvisando(false);
    toast.success(`Mensaje enviado a ${alumnaConTel.length} alumnas`);
    setIsAvisoModalOpen(false);
    setAvisoMensaje("");
  };

  const toggleCheckbox = async (id: string, campo: string, valorActual: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("perfiles").update({ [campo]: !valorActual }).eq("id", id);
    if (!error) {
      setClientes(prev => prev.map(c => c.id === id ? { ...c, [campo]: !valorActual } : c));
    }
  };

  const enviarWhatsApp = (telefono: string, nombre: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tel = telefono?.replace(/\D/g, "");
    if (!tel) { toast.error(`Sin teléfono registrado para ${nombre}.`); return; }
    const msg = encodeURIComponent(`¡Hola ${nombre}! 👋 Te escribimos de R.G Danza. 🎀`);
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  };

  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter((c) => {
        const nombreCompleto = `${c.nombre || ""} ${c.apellido || ""}`.toLowerCase();
        const matchSearch = nombreCompleto.includes(searchTerm.toLowerCase()) ||
          (c.email || "").toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchSearch) return false;
        if (filtroActivo === "Todas") return true;
        if (filtroActivo === "Activas") return c.estado === "activa";
        if (filtroActivo === "Nuevas") return c.estado === "nueva" || !c.estado;
        if (filtroActivo === "Pendientes Doc") return !c.apto_medico || !c.fotocopia_dni;
        return true;
      })
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
  }, [clientes, searchTerm, filtroActivo]);

  // Agrupar por letra inicial del apellido
  const clientesAgrupados = useMemo(() => {
    const grupos: Record<string, Alumna[]> = {};
    clientesFiltrados.forEach(c => {
      const letra = (c.apellido || c.nombre || "?").charAt(0).toUpperCase();
      if (!grupos[letra]) grupos[letra] = [];
      grupos[letra].push(c);
    });
    return grupos;
  }, [clientesFiltrados]);

  const getIniciales = (n: string, a: string) => `${a?.charAt(0) || ""}${n?.charAt(0) || ""}`.toUpperCase();

  const estadoBadge = (estado: string) => {
    if (estado === "activa") return { label: "Activa", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" };
    return { label: "Nueva", cls: "bg-amber-50 text-amber-600 border-amber-100" };
  };

  const docWarning = (c: Alumna) => {
    const faltantes = [];
    if (!c.apto_medico) faltantes.push("Apto");
    if (!c.fotocopia_dni) faltantes.push("DNI");
    return faltantes;
  };

  return (
    <div className="font-dm-sans min-h-screen">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-playfair text-[1.8rem] font-semibold text-[#1A1A22]">
            Alumnas <em className="italic text-[#C97A96]">registradas</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-0.5">
            {clientes.length} en total · ordenadas alfabéticamente
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-[#E8A0B4]/30 rounded-full text-sm outline-none focus:border-[#C97A96] w-full sm:w-[260px] transition-all shadow-sm"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C97A96] opacity-50 text-sm">🔍</span>
          </div>
          <button
            onClick={() => { setAvisoMensaje("¡Hola {nombre}! 👋 Te escribimos de R.G Danza. 🎀\n\n"); setIsAvisoModalOpen(true); }}
            className="bg-white border border-[#E8A0B4]/30 text-[#C97A96] rounded-full px-5 py-2.5 text-[0.82rem] font-semibold hover:bg-[#FDF0F4] hover:border-[#C97A96] transition-all whitespace-nowrap"
          >
            📢 Avisar a todas
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#C97A96] text-white rounded-full px-6 py-2.5 text-[0.82rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md whitespace-nowrap"
          >
            + Inscribir Alumna
          </button>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltroActivo(f)}
            className={`px-4 py-1.5 rounded-full border text-[0.78rem] font-semibold transition-all whitespace-nowrap ${
              filtroActivo === f
                ? "bg-[#C97A96] text-white border-[#C97A96] shadow-sm"
                : "bg-white text-[#8A8A99] border-[#E8A0B4]/30 hover:border-[#C97A96] hover:text-[#C97A96]"
            }`}
          >
            {f}
            {f === "Pendientes Doc" && clientes.filter(c => !c.apto_medico || !c.fotocopia_dni).length > 0 && (
              <span className="ml-1.5 bg-red-400 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full">
                {clientes.filter(c => !c.apto_medico || !c.fotocopia_dni).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── LISTA ESTILO EMAIL ── */}
      {cargando ? (
        <div className="bg-white rounded-2xl border border-[#E8A0B4]/20 shadow-sm">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-48" />
                <div className="h-3 bg-gray-50 rounded w-72" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-[#E8A0B4]/40 text-[#8A8A99]">
          <span className="text-5xl mb-4">🔍</span>
          <p className="font-medium text-sm">No hay alumnas con ese criterio</p>
          <button onClick={() => { setSearchTerm(""); setFiltroActivo("Todas"); }} className="mt-3 text-[#C97A96] text-xs font-semibold hover:underline">Limpiar filtros</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8A0B4]/20 shadow-sm overflow-hidden">

          {/* Cabecera de la tabla */}
          <div className="grid grid-cols-[44px_1fr_180px_140px_120px_130px] gap-0 px-5 py-2.5 bg-[#F7F7F9] border-b border-[#E8A0B4]/20">
            <div />
            <div className="text-[0.65rem] font-black uppercase tracking-[1.5px] text-[#8A8A99]">Alumna</div>
            <div className="text-[0.65rem] font-black uppercase tracking-[1.5px] text-[#8A8A99]">Contacto</div>
            <div className="text-[0.65rem] font-black uppercase tracking-[1.5px] text-[#8A8A99]">Documentación</div>
            <div className="text-[0.65rem] font-black uppercase tracking-[1.5px] text-[#8A8A99]">Estado</div>
            <div className="text-[0.65rem] font-black uppercase tracking-[1.5px] text-[#8A8A99] text-right">Acciones</div>
          </div>

          {/* Filas agrupadas por letra */}
          {Object.entries(clientesAgrupados).map(([letra, grupo]) => (
            <div key={letra}>
              {/* Separador de letra */}
              <div className="px-5 py-1.5 bg-[#FDF0F4]/60 border-b border-t border-[#E8A0B4]/15 flex items-center gap-2">
                <span className="font-playfair text-[1rem] font-bold text-[#C97A96]">{letra}</span>
                <span className="text-[0.7rem] text-[#C97A96]/60 font-medium">{grupo.length} {grupo.length === 1 ? "alumna" : "alumnas"}</span>
              </div>

              {/* Filas de alumnas */}
              {grupo.map((c, idx) => {
                const badge = estadoBadge(c.estado);
                const docs = docWarning(c);
                const isExpanded = expandedId === c.id;
                const isLast = idx === grupo.length - 1;

                return (
                  <div key={c.id} className={`${!isLast ? "border-b border-gray-50" : ""}`}>
                    {/* Fila principal */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className={`grid grid-cols-[44px_1fr_180px_140px_120px_130px] gap-0 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-[#FDF0F4]/40 ${isExpanded ? "bg-[#FDF0F4]/50" : ""}`}
                    >
                      {/* Avatar */}
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F5D0DC] to-[#E8A0B4] flex items-center justify-center text-[0.72rem] font-bold text-white shadow-sm shrink-0">
                          {getIniciales(c.nombre, c.apellido)}
                        </div>
                      </div>

                      {/* Nombre */}
                      <div className="flex flex-col justify-center min-w-0 pr-4">
                        <span className="text-[0.88rem] font-semibold text-[#1A1A22] truncate">
                          {c.apellido}, {c.nombre}
                        </span>
                        <span className="text-[0.75rem] text-[#8A8A99] truncate">{c.email || "Sin email"}</span>
                      </div>

                      {/* Contacto */}
                      <div className="flex flex-col justify-center min-w-0 pr-3">
                        <span className="text-[0.78rem] text-[#4A4A55] font-medium truncate">{c.telefono || "—"}</span>
                        {c.fecha_nacimiento && (
                          <span className="text-[0.72rem] text-[#8A8A99]">{calcularEdad(c.fecha_nacimiento)}</span>
                        )}
                      </div>

                      {/* Documentación */}
                      <div className="flex items-center gap-2 pr-3">
                        <button
                          onClick={(e) => toggleCheckbox(c.id, "apto_medico", c.apto_medico, e)}
                          title={c.apto_medico ? "Apto médico ✓" : "Falta apto médico"}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] font-bold border transition-all ${
                            c.apto_medico
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                              : "bg-red-50 text-red-400 border-red-100 hover:bg-red-100"
                          }`}
                        >
                          {c.apto_medico ? "✓" : "✕"} Apto
                        </button>
                        <button
                          onClick={(e) => toggleCheckbox(c.id, "fotocopia_dni", c.fotocopia_dni, e)}
                          title={c.fotocopia_dni ? "DNI ✓" : "Falta DNI"}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] font-bold border transition-all ${
                            c.fotocopia_dni
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                              : "bg-red-50 text-red-400 border-red-100 hover:bg-red-100"
                          }`}
                        >
                          {c.fotocopia_dni ? "✓" : "✕"} DNI
                        </button>
                      </div>

                      {/* Estado */}
                      <div className="flex items-center pr-3">
                        <span className={`text-[0.68rem] font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => enviarWhatsApp(c.telefono, c.nombre, e)}
                          title="WhatsApp"
                          className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-sm border border-emerald-100"
                        >
                          💬
                        </button>
                        <button
                          onClick={(e) => abrirModalPago(c, e)}
                          title="Registrar pago"
                          className="w-8 h-8 rounded-lg bg-[#FDF0F4] text-[#C97A96] hover:bg-[#C97A96] hover:text-white transition-all flex items-center justify-center text-sm border border-[#E8A0B4]/30"
                        >
                          💰
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          title="Expandir"
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all ${
                            isExpanded
                              ? "bg-[#1A1A22] text-white border-[#1A1A22]"
                              : "bg-[#F7F7F9] text-[#8A8A99] hover:bg-[#1A1A22] hover:text-white border-gray-200"
                          }`}
                        >
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>

                    {/* Panel expandido */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 bg-[#F7F7F9]/60 border-t border-[#E8A0B4]/10">
                        <div className="ml-[44px] grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div className="bg-white rounded-xl p-3.5 border border-[#E8A0B4]/15 shadow-sm">
                            <p className="text-[0.6rem] font-black uppercase tracking-widest text-[#8A8A99] mb-1">Email</p>
                            <p className="text-[0.8rem] font-medium text-[#1A1A22] truncate">{c.email || "—"}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3.5 border border-[#E8A0B4]/15 shadow-sm">
                            <p className="text-[0.6rem] font-black uppercase tracking-widest text-[#8A8A99] mb-1">Nacimiento</p>
                            <p className="text-[0.8rem] font-medium text-[#1A1A22]">
                              {c.fecha_nacimiento
                                ? new Date(c.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-AR")
                                : "—"}
                            </p>
                          </div>
                          <div className="bg-white rounded-xl p-3.5 border border-[#E8A0B4]/15 shadow-sm">
                            <p className="text-[0.6rem] font-black uppercase tracking-widest text-[#8A8A99] mb-1">Autoriza imagen</p>
                            <p className={`text-[0.8rem] font-bold ${c.autoriza_imagen ? "text-emerald-600" : "text-red-400"}`}>
                              {c.autoriza_imagen ? "✅ Sí, autoriza" : "❌ No autoriza"}
                            </p>
                          </div>
                          <div className="bg-white rounded-xl p-3.5 border border-[#E8A0B4]/15 shadow-sm">
                            <p className="text-[0.6rem] font-black uppercase tracking-widest text-[#8A8A99] mb-1">Documentación</p>
                            {docs.length === 0 ? (
                              <p className="text-[0.8rem] font-bold text-emerald-600">✅ Todo entregado</p>
                            ) : (
                              <p className="text-[0.8rem] font-bold text-red-400">❌ Falta: {docs.join(", ")}</p>
                            )}
                          </div>
                        </div>

                        {/* Botones expandidos */}
                        <div className="ml-[44px] flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={(e) => abrirModalEdicion(c, e)}
                            className="inline-flex items-center gap-1.5 bg-[#1A1A22] text-white px-4 py-2 rounded-full text-[0.75rem] font-bold hover:bg-[#C97A96] transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={(e) => enviarWhatsApp(c.telefono, c.nombre, e)}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-full text-[0.75rem] font-bold hover:bg-emerald-700 transition-colors"
                          >
                            💬 WhatsApp
                          </button>
                          <button
                            onClick={(e) => abrirModalPago(c, e)}
                            className="inline-flex items-center gap-1.5 bg-[#C97A96] text-white px-4 py-2 rounded-full text-[0.75rem] font-bold hover:bg-[#1A1A22] transition-colors"
                          >
                            💰 Registrar pago
                          </button>
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="inline-flex items-center gap-1.5 bg-white border border-[#E8A0B4]/30 text-[#4A4A55] px-4 py-2 rounded-full text-[0.75rem] font-bold hover:border-[#C97A96] hover:text-[#C97A96] transition-colors"
                            >
                              ✉️ Email
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Pie de la lista */}
          <div className="px-5 py-3 bg-[#F7F7F9]/50 border-t border-[#E8A0B4]/15 flex items-center justify-between">
            <span className="text-[0.72rem] text-[#8A8A99]">
              Mostrando <strong className="text-[#1A1A22]">{clientesFiltrados.length}</strong> de <strong className="text-[#1A1A22]">{clientes.length}</strong> alumnas
            </span>
            {searchTerm || filtroActivo !== "Todas" ? (
              <button
                onClick={() => { setSearchTerm(""); setFiltroActivo("Todas"); }}
                className="text-[0.72rem] text-[#C97A96] font-semibold hover:underline"
              >
                Limpiar filtros ✕
              </button>
            ) : null}
          </div>
        </div>
      )}


      {/* ══════════ MODAL: INSCRIBIR ══════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-10 py-8 text-center border-b border-[#E8A0B4]/20 relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-[#C97A96] hover:text-[#1A1A22] text-xl">✕</button>
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">💌</div>
              <h2 className="font-playfair text-2xl font-semibold text-[#1A1A22]">Inscribir Alumna</h2>
              <p className="text-[#8A8A99] text-xs mt-2 leading-relaxed">Le enviaremos un email para completar su perfil.</p>
            </div>
            <div className="p-10 space-y-4">
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-2">Nombre</label>
                <input required type="text" value={formInscribir.nombre} onChange={e => setFormInscribir({...formInscribir, nombre: e.target.value})} className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50" />
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-2">Apellido</label>
                <input required type="text" value={formInscribir.apellido} onChange={e => setFormInscribir({...formInscribir, apellido: e.target.value})} className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50" />
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-2">Email</label>
                <input required type="email" value={formInscribir.email} onChange={e => setFormInscribir({...formInscribir, email: e.target.value})} className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50" />
              </div>
              <button
                onClick={handleInscribirAlumna}
                disabled={isSubmitting || !formInscribir.nombre || !formInscribir.email}
                className="w-full bg-[#1A1A22] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#C97A96] transition-all shadow-xl disabled:opacity-50 uppercase tracking-widest mt-2"
              >
                {isSubmitting ? "Enviando..." : "Enviar Invitación ✦"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: EDITAR ALUMNA ══════════ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#E8A0B4]/20">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <div>
                <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">Editar Alumna</h3>
                <p className="text-[0.8rem] text-[#C97A96] font-medium mt-0.5">{editForm.nombre} {editForm.apellido}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#C97A96] hover:text-[#1A1A22] text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">Nombre *</label>
                  <input
                    required type="text"
                    value={editForm.nombre}
                    onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">Apellido *</label>
                  <input
                    required type="text"
                    value={editForm.apellido}
                    onChange={e => setEditForm({...editForm, apellido: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={editForm.telefono}
                    onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={editForm.fecha_nacimiento}
                    onChange={e => setEditForm({...editForm, fecha_nacimiento: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">Estado</label>
                  <select
                    value={editForm.estado}
                    onChange={e => setEditForm({...editForm, estado: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                  >
                    <option value="nueva">Nueva</option>
                    <option value="activa">Activa</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">Fecha de Inicio (inscripción real)</label>
                <input
                  type="date"
                  value={editForm.fecha_inicio}
                  onChange={e => setEditForm({...editForm, fecha_inicio: e.target.value})}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                />
                <p className="text-[0.7rem] text-[#8A8A99] mt-1">Fecha real en la que la alumna empezó. Se guarda en alumna_clases.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-full font-semibold text-sm hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdit || !editForm.nombre || !editForm.apellido}
                  className="flex-[2] bg-[#C97A96] text-white py-3 rounded-full font-semibold text-sm hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
                >
                  {guardandoEdit ? "Guardando..." : "Guardar Cambios ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: AVISO MASIVO ══════════ */}
      {isAvisoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#E8A0B4]/20">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <div>
                <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">📢 Aviso Masivo</h3>
                <p className="text-[0.8rem] text-[#8A8A99] mt-0.5">
                  Se enviará a {clientes.filter(c => c.telefono?.replace(/\D/g, "")).length} alumnas con teléfono
                </p>
              </div>
              <button onClick={() => { if (!avisando) setIsAvisoModalOpen(false); }} className="text-[#C97A96] hover:text-[#1A1A22] text-xl transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-2">Mensaje</label>
                <textarea
                  rows={5}
                  value={avisoMensaje}
                  onChange={e => setAvisoMensaje(e.target.value)}
                  placeholder="Escribí tu mensaje... Usá {nombre} para personalizar."
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all resize-none"
                />
                <p className="text-[0.7rem] text-[#8A8A99] mt-1">Tip: Usá <strong>{"{nombre}"}</strong> y se reemplazará por el nombre de cada alumna.</p>
              </div>

              {avisando && (
                <div className="bg-[#FDF0F4] rounded-xl p-4 border border-[#E8A0B4]/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[0.82rem] font-semibold text-[#1A1A22]">Enviando mensajes...</span>
                    <span className="text-[0.82rem] font-bold text-[#C97A96]">{avisoProgreso.enviados}/{avisoProgreso.total}</span>
                  </div>
                  <div className="w-full bg-[#E8A0B4]/20 rounded-full h-2">
                    <div
                      className="bg-[#C97A96] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${avisoProgreso.total > 0 ? (avisoProgreso.enviados / avisoProgreso.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { if (!avisando) setIsAvisoModalOpen(false); }}
                  disabled={avisando}
                  className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-full font-semibold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviarAvisoMasivo}
                  disabled={avisando || !avisoMensaje.trim()}
                  className="flex-[2] bg-[#C97A96] text-white py-3 rounded-full font-semibold text-sm hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
                >
                  {avisando ? `Enviando ${avisoProgreso.enviados}/${avisoProgreso.total}...` : "Enviar a Todas →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: REGISTRAR PAGO ══════════ */}
      {isPagoModalOpen && alumnaParaPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <div>
                <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">Registrar Pago</h3>
                <p className="text-[0.8rem] text-[#C97A96] font-medium mt-0.5">{alumnaParaPago.nombre} {alumnaParaPago.apellido}</p>
              </div>
              <button onClick={() => setIsPagoModalOpen(false)} className="text-[#C97A96] hover:text-[#1A1A22] text-xl transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Monto ($) *</label>
                  <input
                    required type="number" min="0" placeholder="Ej: 8000"
                    value={pagoForm.monto}
                    onChange={e => setPagoForm({...pagoForm, monto: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Método *</label>
                  <select
                    value={pagoForm.metodo_pago}
                    onChange={e => setPagoForm({...pagoForm, metodo_pago: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                  >
                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Fecha pago *</label>
                  <input
                    required type="date"
                    value={pagoForm.fecha_pago}
                    onChange={e => setPagoForm({...pagoForm, fecha_pago: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Mes *</label>
                  <input
                    required placeholder="Ej: Abril 2026"
                    value={pagoForm.mes_correspondiente}
                    onChange={e => setPagoForm({...pagoForm, mes_correspondiente: e.target.value})}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Nota (opcional)</label>
                <input
                  type="text" placeholder="Ej: Cuota completa"
                  value={pagoForm.nota}
                  onChange={e => setPagoForm({...pagoForm, nota: e.target.value})}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                />
              </div>
              <label className="flex items-center gap-3 py-3 px-4 bg-[#FDF0F4]/60 rounded-xl border border-[#E8A0B4]/15 cursor-pointer hover:bg-[#FDF0F4] transition-colors">
                <input
                  type="checkbox"
                  checked={enviarComprobante}
                  onChange={(e) => setEnviarComprobante(e.target.checked)}
                  className="w-4 h-4 accent-[#C97A96] rounded"
                />
                <div>
                  <span className="text-[0.82rem] font-semibold text-[#1A1A22]">Enviar comprobante por WhatsApp</span>
                  <p className="text-[0.7rem] text-[#8A8A99] mt-0.5">Se abrirá WhatsApp con el detalle del pago</p>
                </div>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setIsPagoModalOpen(false); setEnviarComprobante(false); }}
                  className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarPago}
                  disabled={guardandoPago || !pagoForm.monto}
                  className="flex-[2] bg-[#C97A96] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
                >
                  {guardandoPago ? "Guardando..." : "Registrar Pago ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}