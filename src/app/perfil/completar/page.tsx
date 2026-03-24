"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { User } from "@supabase/supabase-js";

export default function CompletarPerfil() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState({
    nombre: "", apellido: "", telefono: "", fecha_nacimiento: "", autoriza_imagen: false
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      // Si la URL tiene tokens en el hash, intercambiarlos manualmente
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (data?.user) {
            setUser(data.user);
            const meta = data.user.user_metadata;
            if (meta?.display_name || meta?.last_name) {
              setFormData(prev => ({
                ...prev,
                nombre: prev.nombre || meta.display_name || "",
                apellido: prev.apellido || meta.last_name || "",
              }));
            }
            // Limpiar el hash de la URL
            window.history.replaceState(null, "", window.location.pathname);
            setChecking(false);
            return;
          }
        }
      }

      // Sin hash: verificar si ya hay sesión existente
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const meta = session.user.user_metadata;
        if (meta?.display_name || meta?.last_name) {
          setFormData(prev => ({
            ...prev,
            nombre: prev.nombre || meta.display_name || "",
            apellido: prev.apellido || meta.last_name || "",
          }));
        }
      }
      setChecking(false);
    };

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("No se encontró una sesión activa. Usá el link que te llegó al mail.");
      return;
    }
    setLoading(true);

    try {
      // Actualizar contraseña
      if (password) {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
      }

      // Guardar datos en perfiles
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
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#C97A96] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8A8A99] text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="font-playfair text-2xl font-bold text-[#1A1A22] mb-2">Link inválido o expirado</h2>
          <p className="text-[#8A8A99] text-sm mb-6">
            No pudimos verificar tu sesión. Pedile a la academia que te reenvíe la invitación.
          </p>
          <a href="/" className="inline-block bg-[#C97A96] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#1A1A22] transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
            <h2 className="font-playfair text-3xl font-bold text-[#1A1A22]">¡Bienvenida! ✨</h2>
            <p className="text-[#8A8A99] text-sm mt-2">Configurá tu acceso y completá tus datos.</p>
        </div>

        <div className="space-y-4">
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
                value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
             <input required placeholder="Apellido" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
          </div>

          <input required type="tel" placeholder="WhatsApp (Ej: 351...)" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />

          <div>
            <label className="block text-[0.65rem] font-bold text-[#8A8A99] uppercase mb-1 ml-1">Fecha de nacimiento</label>
            <input required type="date" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
              value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} />
          </div>

          <label className="flex items-start gap-3 p-4 bg-[#FDF0F4]/50 rounded-2xl cursor-pointer border border-dashed border-[#E8A0B4]/30">
            <input type="checkbox" className="mt-1 accent-[#C97A96]"
              checked={formData.autoriza_imagen} onChange={e => setFormData({...formData, autoriza_imagen: e.target.checked})} />
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
