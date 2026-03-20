"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { invitarAlumnaAction } from "./actions"; // Este archivo debe existir en la misma carpeta

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

const FILTROS = ["Todas", "Activas", "Nuevas", "Pendientes Doc"];

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Alumna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("Todas");

  // Estados del Modal de Inscripción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInscribir, setFormInscribir] = useState({
    nombre: "",
    apellido: "",
    email: ""
  });

  useEffect(() => { 
    fetchClientes(); 
  }, []);

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

  // --- LÓGICA DE INVITACIÓN (REPARADA) ---
  const handleInscribirAlumna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Evita doble clic

    setIsSubmitting(true);

    try {
      // LLAMAMOS A LA SERVER ACTION (Seguro y no se tilda)
      const result = await invitarAlumnaAction(
        formInscribir.email,
        formInscribir.nombre,
        formInscribir.apellido
      );

      if (result.success) {
        alert(`¡Invitación enviada con éxito a ${formInscribir.email}!`);
        setIsModalOpen(false);
        setFormInscribir({ nombre: "", apellido: "", email: "" });
        await fetchClientes(); // Recargamos la lista
      } else {
        alert("Error: " + result.error);
      }
    } catch (error: any) {
      console.error("Error inesperado:", error);
      alert("Ocurrió un error al procesar la invitación.");
    } finally {
      // ESTO ES CLAVE: Se asegura de quitar el estado de carga
      setIsSubmitting(false);
    }
  };

  // --- FILTRADO COMBINADO ---
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

  // --- ACCIONES RÁPIDAS ---
  const toggleCheckbox = async (id: string, campo: string, valorActual: boolean) => {
    const { error } = await supabase.from("perfiles").update({ [campo]: !valorActual }).eq("id", id);
    if (!error) {
      setClientes(prev => prev.map(c => c.id === id ? { ...c, [campo]: !valorActual } : c));
    }
  };

  const enviarWhatsAppSeguimiento = (telefono: string, nombre: string) => {
    if (!telefono) return alert("No hay teléfono registrado.");
    const msg = encodeURIComponent(`¡Hola ${nombre}! 👋 Te escribimos de R.G Danza para saludarte y ver cómo venís con las clases. 🎀`);
    window.open(`https://wa.me/${telefono.replace(/\D/g, "")}?text=${msg}`, "_blank");
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
          {/* BUSCADOR */}
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

      {/* GRILLA DE ALUMNAS */}
      {cargando ? (
        <div className="text-center py-20 text-[#8A8A99] font-medium">Sincronizando con la base de datos...</div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#E8A0B4]/40">
           <p className="text-[#8A8A99] text-sm font-light">No encontramos alumnas con ese nombre o filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clientesFiltrados.map((c) => (
            <div key={c.id} className="bg-white border border-[#E8A0B4]/20 rounded-[2rem] p-7 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#FDF0F4] text-[#C97A96] flex items-center justify-center font-bold text-xl">
                    {getIniciales(c.nombre, c.apellido)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A22] text-[1.05rem] leading-tight">{c.nombre} {c.apellido}</h3>
                    <p className="text-xs text-[#8A8A99] mt-1">{c.email}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${c.autoriza_imagen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {c.autoriza_imagen ? '📸 OK' : '🚫 NO'}
                </div>
              </div>

              {/* DOCUMENTACIÓN */}
              <div className="bg-[#F7F7F9] rounded-2xl p-5 mb-6 grid grid-cols-2 gap-4 border border-[#E8A0B4]/5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={c.apto_medico} 
                    onChange={() => toggleCheckbox(c.id, "apto_medico", c.apto_medico)}
                    className="w-5 h-5 accent-[#C97A96] rounded-lg cursor-pointer"
                  />
                  <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${c.apto_medico ? 'text-[#1A1A22]' : 'text-red-400'}`}>Apto Médico</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={c.fotocopia_dni} 
                    onChange={() => toggleCheckbox(c.id, "fotocopia_dni", c.fotocopia_dni)}
                    className="w-5 h-5 accent-[#C97A96] rounded-lg cursor-pointer"
                  />
                  <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${c.fotocopia_dni ? 'text-[#1A1A22]' : 'text-red-400'}`}>Copia DNI</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-[#1A1A22] text-white py-3 rounded-2xl text-[0.7rem] font-bold tracking-widest hover:bg-[#C97A96] transition-colors uppercase">
                  Registrar Pago
                </button>
                <button 
                  onClick={() => enviarWhatsAppSeguimiento(c.telefono || "", c.nombre)}
                  className="w-12 h-12 bg-green-50 text-green-600 border border-green-100 rounded-2xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all text-xl"
                >
                  💬
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL INSCRIBIR ALUMNA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-10 py-8 text-center border-b border-[#E8A0B4]/20 relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-[#C97A96] hover:text-[#1A1A22]">✕</button>
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">💌</div>
              <h2 className="font-playfair text-2xl font-semibold text-[#1A1A22]">Inscribir Alumna</h2>
              <p className="text-[#8A8A99] text-xs mt-2 leading-relaxed">
                Ingresá sus datos y le enviaremos un email para que complete su perfil.
              </p>
            </div>
            
            <form onSubmit={handleInscribirAlumna} className="p-10 space-y-4">
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-2 ml-1">Nombre</label>
                <input required type="text" value={formInscribir.nombre} onChange={e => setFormInscribir({...formInscribir, nombre: e.target.value})} className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50" />
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-2 ml-1">Apellido</label>
                <input required type="text" value={formInscribir.apellido} onChange={e => setFormInscribir({...formInscribir, apellido: e.target.value})} className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50" />
              </div>
              <div className="mb-6">
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-2 ml-1">Email de la Alumna</label>
                <input required type="email" value={formInscribir.email} onChange={e => setFormInscribir({...formInscribir, email: e.target.value})} className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50" />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-[#1A1A22] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#C97A96] transition-all shadow-xl disabled:opacity-50 uppercase tracking-widest"
              >
                {isSubmitting ? "Procesando..." : "Enviar Invitación ✦"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}