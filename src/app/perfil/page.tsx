"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "", apellido: "", telefono: "", fecha_nacimiento: "", autoriza_imagen: false
  });

  useEffect(() => {
    fetchPerfil();
  }, []);

  async function fetchPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
      if (data) {
        setPerfil(data);
        setFormData({
          nombre: data.nombre || "",
          apellido: data.apellido || "",
          telefono: data.telefono || "",
          fecha_nacimiento: data.fecha_nacimiento || "",
          autoriza_imagen: data.autoriza_imagen || false
        });
      }
    }
    setLoading(false);
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("perfiles").update(formData).eq("id", user.id);
      if (!error) {
        alert("¡Perfil actualizado! ✨");
        setEditMode(false);
        fetchPerfil();
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

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
              <button 
                onClick={() => setEditMode(true)}
                className="text-[#C97A96] text-sm font-bold border border-[#C97A96]/30 px-5 py-2 rounded-full hover:bg-[#FDF0F4]"
              >
                Editar datos
              </button>
            )}
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase ml-1">Nombre</label>
                <input 
                  disabled={!editMode}
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-[#F7F7F9] border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#C97A96] outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase ml-1">Apellido</label>
                <input 
                  disabled={!editMode}
                  value={formData.apellido}
                  onChange={e => setFormData({...formData, apellido: e.target.value})}
                  className="w-full bg-[#F7F7F9] border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#C97A96] outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase ml-1">WhatsApp de contacto</label>
              <input 
                disabled={!editMode}
                value={formData.telefono}
                onChange={e => setFormData({...formData, telefono: e.target.value})}
                className="w-full bg-[#F7F7F9] border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#C97A96] outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase ml-1">Fecha de Nacimiento</label>
              <input 
                disabled={!editMode}
                type="date"
                value={formData.fecha_nacimiento}
                onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                className="w-full bg-[#F7F7F9] border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#C97A96] outline-none disabled:opacity-60"
              />
            </div>

            <div className="bg-[#FDF0F4]/50 p-5 rounded-2xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  disabled={!editMode}
                  type="checkbox"
                  checked={formData.autoriza_imagen}
                  onChange={e => setFormData({...formData, autoriza_imagen: e.target.checked})}
                  className="mt-1 accent-[#C97A96] w-4 h-4"
                />
                <span className="text-[0.8rem] text-[#4A4A55] leading-relaxed">
                  Autorizo el uso de mi imagen (o la de mi representado) para redes sociales de la academia.
                </span>
              </label>
            </div>

            {editMode && (
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditMode(false)}
                  className="flex-1 bg-gray-100 text-[#8A8A99] py-3 rounded-2xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-2 bg-[#1A1A22] text-white px-10 py-3 rounded-2xl font-bold text-sm hover:bg-[#C97A96] transition-all shadow-lg"
                >
                  Guardar Cambios
                </button>
              </div>
            )}
          </form>

          {/* ESTADO DE DOCUMENTACIÓN (Solo lectura para la alumna) */}
          <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-4">
             <div className={`p-4 rounded-2xl border ${perfil?.apto_medico ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'} text-center`}>
                <p className="text-[10px] font-black uppercase mb-1">Apto Médico</p>
                <p className="text-xs font-bold">{perfil?.apto_medico ? 'ENTREGADO ✅' : 'PENDIENTE ❌'}</p>
             </div>
             <div className={`p-4 rounded-2xl border ${perfil?.fotocopia_dni ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'} text-center`}>
                <p className="text-[10px] font-black uppercase mb-1">Copia DNI</p>
                <p className="text-xs font-bold">{perfil?.fotocopia_dni ? 'ENTREGADO ✅' : 'PENDIENTE ❌'}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}