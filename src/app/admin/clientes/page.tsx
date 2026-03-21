"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { invitarAlumnaAction } from "./actions";

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

function mesActualStr() {
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const hoy = new Date();
  return `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Alumna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("Todas");

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

  // Modal ver perfil completo
  const [perfilModal, setPerfilModal] = useState<Alumna | null>(null);

  useEffect(() => { fetchClientes(); }, []);

  async function fetchClientes() {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .order("nombre", { ascending: true });
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error cargando perfiles:", error);
    } finally {
      setCargando(false);
    }
  }

  // Inscribir alumna
  const handleInscribirAlumna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await invitarAlumnaAction(formInscribir.email, formInscribir.nombre, formInscribir.apellido);
      if (result.success) {
        alert(`¡Invitación enviada con éxito a ${formInscribir.email}!`);
        setIsModalOpen(false);
        setFormInscribir({ nombre: "", apellido: "", email: "" });
        await fetchClientes();
      } else {
        alert("Error: " + result.error);
      }
    } catch (error: any) {
      alert("Ocurrió un error al procesar la invitación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal pago
  const abrirModalPago = (alumna: Alumna) => {
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

  // Guardar pago
  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnaParaPago || !pagoForm.monto) return;
    setGuardandoPago(true);
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
      alert("Error al registrar: " + error.message);
    } else {
      alert(`✅ Pago de $${pagoForm.monto} registrado para ${alumnaParaPago.nombre}`);
      setIsPagoModalOpen(false);
      setAlumnaParaPago(null);
    }
  };

  // Filtrado
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const nombreCompleto = `${c.nombre || ""} ${c.apellido || ""}`.toLowerCase();
      const matchSearch = nombreCompleto.includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (filtroActivo === "Todas") return true;
      if (filtroActivo === "Activas") return c.estado === "activa";
      if (filtroActivo === "Nuevas") return c.estado === "nueva";
      if (filtroActivo === "Pendientes Doc") return !c.apto_medico || !c.fotocopia_dni;
      return true;
    });
  }, [clientes, searchTerm, filtroActivo]);

  // Toggle docs
  const toggleCheckbox = async (id: string, campo: string, valorActual: boolean) => {
    const { error } = await supabase.from("perfiles").update({ [campo]: !valorActual }).eq("id", id);
    if (!error) {
      setClientes(prev => prev.map(c => c.id === id ? { ...c, [campo]: !valorActual } : c));
    }
  };

  // WhatsApp
  const enviarWhatsApp = (telefono: string, nombre: string) => {
    const tel = telefono?.replace(/\D/g, "");
    if (!tel) {
      alert(`No hay teléfono registrado para ${nombre}.`);
      return;
    }
    const msg = encodeURIComponent(`¡Hola ${nombre}! 👋 Te escribimos de R.G Danza para saludarte. 🎀`);
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  };

  const getIniciales = (n: string, a: string) => `${n?.charAt(0) || 'A'}${a?.charAt(0) || 'L'}`.toUpperCase();

  return (
    <div className="font-dm-sans min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-playfair text-[1.8rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Alumnas</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">{clientes.length} registradas en total</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-[#E8A0B4]/30 rounded-full text-sm outline-none focus:border-[#C97A96] w-full sm:w-[250px] transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#C97A96] text-white rounded-full px-6 py-2.5 text-[0.82rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md"
          >
            + Inscribir Alumna
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltroActivo(f)}
            className={`px-5 py-1.5 rounded-full border text-[0.8rem] font-medium transition-all ${
              filtroActivo === f ? "bg-[#C97A96] text-white border-[#C97A96]" : "bg-white text-[#8A8A99] border-[#E8A0B4]/30 hover:border-[#C97A96]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* GRILLA */}
      {cargando ? (
        <div className="text-center py-20 text-[#8A8A99] font-medium">Sincronizando...</div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#E8A0B4]/40">
          <p className="text-[#8A8A99] text-sm">No hay alumnas con ese filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clientesFiltrados.map((c) => (
            <div key={c.id} className="bg-white border border-[#E8A0B4]/20 rounded-[2rem] p-7 shadow-sm hover:shadow-xl transition-all duration-300">
              {/* Cabecera */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#FDF0F4] text-[#C97A96] flex items-center justify-center font-bold text-xl">
                    {getIniciales(c.nombre, c.apellido)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A22] text-[1.05rem] leading-tight">{c.nombre} {c.apellido}</h3>
                    <p className="text-xs text-[#8A8A99] mt-0.5">{c.email || "Sin email"}</p>
                    <p className="text-xs text-[#8A8A99]">{c.telefono || "Sin teléfono"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${c.estado === 'activa' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {c.estado || 'nueva'}
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${c.autoriza_imagen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {c.autoriza_imagen ? '📸 OK' : '🚫 NO'}
                  </div>
                </div>
              </div>

              {/* Documentación */}
              <div className="bg-[#F7F7F9] rounded-2xl p-4 mb-5 grid grid-cols-2 gap-3 border border-[#E8A0B4]/5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!c.apto_medico}
                    onChange={() => toggleCheckbox(c.id, "apto_medico", c.apto_medico)}
                    className="w-4 h-4 accent-[#C97A96] cursor-pointer"
                  />
                  <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${c.apto_medico ? 'text-[#1A1A22]' : 'text-red-400'}`}>
                    Apto Médico
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!c.fotocopia_dni}
                    onChange={() => toggleCheckbox(c.id, "fotocopia_dni", c.fotocopia_dni)}
                    className="w-4 h-4 accent-[#C97A96] cursor-pointer"
                  />
                  <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${c.fotocopia_dni ? 'text-[#1A1A22]' : 'text-red-400'}`}>
                    Copia DNI
                  </span>
                </label>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => abrirModalPago(c)}
                  className="flex-1 bg-[#1A1A22] text-white py-3 rounded-2xl text-[0.7rem] font-bold tracking-widest hover:bg-[#C97A96] transition-colors uppercase"
                >
                  💰 Registrar Pago
                </button>
                <button
                  onClick={() => enviarWhatsApp(c.telefono, c.nombre)}
                  title="Enviar WhatsApp"
                  className="w-12 h-12 bg-green-50 text-green-600 border border-green-100 rounded-2xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all text-xl"
                >
                  💬
                </button>
                <button
                  onClick={() => setPerfilModal(c)}
                  title="Ver perfil completo"
                  className="w-12 h-12 bg-[#FDF0F4] text-[#C97A96] border border-[#E8A0B4]/30 rounded-2xl flex items-center justify-center hover:bg-[#C97A96] hover:text-white transition-all text-sm font-bold"
                >
                  👁
                </button>
              </div>
            </div>
          ))}
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
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsPagoModalOpen(false)}
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

      {/* ══════════ MODAL: VER PERFIL ══════════ */}
      {perfilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">Perfil de Alumna</h3>
              <button onClick={() => setPerfilModal(null)} className="text-[#C97A96] hover:text-[#1A1A22] text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-2xl bg-[#FDF0F4] text-[#C97A96] flex items-center justify-center font-bold text-2xl">
                  {getIniciales(perfilModal.nombre, perfilModal.apellido)}
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1A22] text-lg">{perfilModal.nombre} {perfilModal.apellido}</h4>
                  <span className={`text-[0.75rem] font-bold px-2.5 py-1 rounded-full ${perfilModal.estado === 'activa' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {perfilModal.estado || 'nueva'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-[#8A8A99]">Email</span>
                  <span className="font-medium">{perfilModal.email || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-[#8A8A99]">Teléfono</span>
                  <span className="font-medium">{perfilModal.telefono || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-[#8A8A99]">Nacimiento</span>
                  <span className="font-medium">
                    {perfilModal.fecha_nacimiento
                      ? new Date(perfilModal.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-AR')
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-[#8A8A99]">Autoriza imagen</span>
                  <span className="font-medium">{perfilModal.autoriza_imagen ? '✅ Sí' : '❌ No'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-[#8A8A99]">Apto médico</span>
                  <span className="font-medium">{perfilModal.apto_medico ? '✅ Entregado' : '❌ Pendiente'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8A8A99]">Fotocopia DNI</span>
                  <span className="font-medium">{perfilModal.fotocopia_dni ? '✅ Entregada' : '❌ Pendiente'}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { enviarWhatsApp(perfilModal.telefono, perfilModal.nombre); setPerfilModal(null); }}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                >
                  💬 WhatsApp
                </button>
                <button
                  onClick={() => { abrirModalPago(perfilModal); setPerfilModal(null); }}
                  className="flex-1 bg-[#C97A96] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1A1A22] transition-colors"
                >
                  💰 Registrar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}