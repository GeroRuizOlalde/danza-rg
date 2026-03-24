"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<"perfil" | "academia">("perfil");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // --- ESTADOS: MI PERFIL ---
  const [perfil, setPerfil] = useState({ nombre: "", email: "" });

  // --- ESTADOS: ACADEMIA ---
  const [academia, setAcademia] = useState({ id: "", nombre: "", telefono: "", email: "", direccion: "", instagram: "" });

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Traer datos del Perfil
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setPerfil({
            email: user.email || "",
            nombre: user.user_metadata?.display_name || "",
          });
        }

        // 2. Traer datos de la Academia
        const { data: infoAcademia } = await supabase.from("academia_info").select("*").single();
        if (infoAcademia) {
          setAcademia(infoAcademia);
        }
      } catch (error) {
        console.error("Error al cargar configuración:", error);
      } finally {
        setCargando(false);
      }
    }
    fetchData();
  }, []);

  // --- GUARDAR PERFIL ---
  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: perfil.nombre }
    });
    setGuardando(false);
    if (error) toast.error("Error al guardar perfil.");
    else toast.success("¡Perfil actualizado!");
  };

  // --- GUARDAR ACADEMIA ---
  const handleGuardarAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const { error } = await supabase.from("academia_info").update({
      nombre: academia.nombre,
      telefono: academia.telefono,
      email: academia.email,
      direccion: academia.direccion,
      instagram: academia.instagram
    }).eq("id", academia.id);
    
    setGuardando(false);
    if (error) toast.error("Error al guardar los datos de la academia.");
    else toast.success("¡Datos de la academia actualizados!");
  };

  if (cargando) return <div className="flex h-[50vh] items-center justify-center text-[#8A8A99]">Cargando configuración...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
          Configuración <em className="italic text-[#C97A96]">General</em>
        </h1>
        <p className="text-[0.83rem] text-[#8A8A99] mt-1">
          Administrá tu cuenta y la información pública del estudio
        </p>
      </div>

      {/* TABS (PESTAÑAS) */}
      <div className="flex gap-4 mb-6 border-b border-[#E8A0B4]/20 pb-px">
        <button 
          onClick={() => setTab("perfil")}
          className={`pb-3 px-2 text-[0.85rem] font-semibold transition-all border-b-2 ${tab === "perfil" ? "border-[#C97A96] text-[#C97A96]" : "border-transparent text-[#8A8A99] hover:text-[#4A4A55]"}`}
        >
          👤 Mi Perfil
        </button>
        <button 
          onClick={() => setTab("academia")}
          className={`pb-3 px-2 text-[0.85rem] font-semibold transition-all border-b-2 ${tab === "academia" ? "border-[#C97A96] text-[#C97A96]" : "border-transparent text-[#8A8A99] hover:text-[#4A4A55]"}`}
        >
          🏫 Datos de la Academia
        </button>
      </div>

      {/* CONTENIDO: MI PERFIL */}
      {tab === "perfil" && (
        <form onSubmit={handleGuardarPerfil} className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-7 shadow-sm">
          <h2 className="text-[1.1rem] font-semibold text-[#1A1A22] mb-5">Información personal</h2>
          <div className="grid gap-5 max-w-md">
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Tu Nombre (Visible en el panel)</label>
              <input type="text" value={perfil.nombre} onChange={e => setPerfil({...perfil, nombre: e.target.value})} className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all" />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Email de acceso (No se puede cambiar acá)</label>
              <input type="email" disabled value={perfil.email} className="w-full border-[1.5px] border-[#E8A0B4]/10 bg-gray-50 rounded-xl px-4 py-2.5 text-[0.9rem] text-gray-400 outline-none cursor-not-allowed" />
            </div>
            <button type="submit" disabled={guardando} className="mt-2 w-fit bg-[#C97A96] text-white px-7 py-2.5 rounded-full text-[0.85rem] font-medium hover:bg-[#1A1A22] transition-all disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </form>
      )}

      {/* CONTENIDO: ACADEMIA */}
      {tab === "academia" && (
        <form onSubmit={handleGuardarAcademia} className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-7 shadow-sm">
          <h2 className="text-[1.1rem] font-semibold text-[#1A1A22] mb-1">Información pública</h2>
          <p className="text-[0.8rem] text-[#8A8A99] mb-5">Estos datos se mostrarán a las alumnas en la página web pública.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Nombre de la Academia</label>
              <input type="text" value={academia.nombre} onChange={e => setAcademia({...academia, nombre: e.target.value})} className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all" />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Instagram (Ej: @rg.danza)</label>
              <input type="text" value={academia.instagram} onChange={e => setAcademia({...academia, instagram: e.target.value})} className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all" />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Teléfono / WhatsApp público</label>
              <input type="text" value={academia.telefono} onChange={e => setAcademia({...academia, telefono: e.target.value})} className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all" />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Email de contacto público</label>
              <input type="email" value={academia.email} onChange={e => setAcademia({...academia, email: e.target.value})} className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Dirección física</label>
              <input type="text" value={academia.direccion} onChange={e => setAcademia({...academia, direccion: e.target.value})} className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all" />
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-[#E8A0B4]/20 flex justify-end">
            <button type="submit" disabled={guardando} className="bg-[#1A1A22] text-white px-8 py-2.5 rounded-full text-[0.85rem] font-medium hover:bg-[#C97A96] transition-all disabled:opacity-50">
              {guardando ? 'Actualizando web...' : 'Guardar y actualizar web'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}