"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CompletarPerfil() {
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState({
    nombre: "", apellido: "", telefono: "", fecha_nacimiento: "", autoriza_imagen: false
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Obtenemos el usuario que entró por el link del mail
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        // 2. ACTUALIZAMOS LA CONTRASEÑA (Lo más importante)
        if (password) {
          const { error: authError } = await supabase.auth.updateUser({ password });
          if (authError) throw authError;
        }

        // 3. Guardamos los datos en la tabla perfiles
        const { error: dbError } = await supabase.from("perfiles").upsert({
          id: user.id,
          ...formData,
          updated_at: new Date()
        });

        if (dbError) throw dbError;

        toast.success("¡Cuenta configurada con éxito! Ya podés reservar.");
        router.push("/turnero");
      } catch (error: any) {
        toast.error("Error: " + error.message);
      }
    } else {
      toast.error("No se encontró una sesión activa. Usá el link que te llegó al mail.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
            <h2 className="font-playfair text-3xl font-bold text-[#1A1A22]">¡Bienvenida! ✨</h2>
            <p className="text-[#8A8A99] text-sm mt-2">Configurá tu acceso y completá tus datos.</p>
        </div>
        
        <div className="space-y-4">
          {/* CAMPO DE CONTRASEÑA NUEVO */}
          <div className="bg-[#F7F7F9] p-4 rounded-2xl border border-[#E8A0B4]/20">
            <label className="block text-[0.7rem] font-bold text-[#C97A96] uppercase mb-2">Elegí tu Contraseña</label>
            <input 
                required type="password" placeholder="Mínimo 6 caracteres"
                className="w-full bg-transparent outline-none text-sm"
                value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <input required placeholder="Nombre" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" 
                onChange={e => setFormData({...formData, nombre: e.target.value})} />
             <input required placeholder="Apellido" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" 
                onChange={e => setFormData({...formData, apellido: e.target.value})} />
          </div>

          <input required type="tel" placeholder="WhatsApp (Ej: 351...)" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" 
            onChange={e => setFormData({...formData, telefono: e.target.value})} />

          <div>
            <label className="block text-[0.65rem] font-bold text-[#8A8A99] uppercase mb-1 ml-1">Fecha de nacimiento</label>
            <input required type="date" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" 
              onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} />
          </div>

          <label className="flex items-start gap-3 p-4 bg-[#FDF0F4]/50 rounded-2xl cursor-pointer border border-dashed border-[#E8A0B4]/30">
            <input type="checkbox" className="mt-1 accent-[#C97A96]" 
              onChange={e => setFormData({...formData, autoriza_imagen: e.target.checked})} />
            <span className="text-[0.75rem] text-[#4A4A55] leading-relaxed">
              Autorizo el uso de mi imagen para fines publicitarios de la academia.
            </span>
          </label>
        </div>

        <button disabled={loading} className="w-full mt-8 bg-[#1A1A22] text-white py-4 rounded-2xl font-bold hover:bg-[#C97A96] transition-all shadow-lg">
          {loading ? "Guardando..." : "Finalizar Registro →"}
        </button>
      </form>
    </div>
  );
}