"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function CompletarPerfil() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    fecha_nacimiento: "",
    autoriza_imagen: false,
  });
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (data?.user) {
            const meta = data.user.user_metadata;
            setUser(data.user);
            setFormData((prev) => ({
              ...prev,
              nombre: prev.nombre || meta?.display_name || "",
              apellido: prev.apellido || meta?.last_name || "",
            }));
            window.history.replaceState(null, "", window.location.pathname);
            setChecking(false);
            return;
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const meta = session.user.user_metadata;
        setUser(session.user);
        setFormData((prev) => ({
          ...prev,
          nombre: prev.nombre || meta?.display_name || "",
          apellido: prev.apellido || meta?.last_name || "",
        }));
      }

      setChecking(false);
    }

    void init();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("No se encontró una sesión activa. Usá el link del email.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      const { error: dbError } = await supabase.from("perfiles").upsert({
        id: user.id,
        ...formData,
        updated_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      toast.success("¡Cuenta configurada con éxito! Ya podés reservar.");
      router.push("/turnero");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos completar tu perfil.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center text-[#8A8A99]">Verificando sesión...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="font-playfair text-2xl font-bold text-[#1A1A22] mb-2">Link inválido o expirado</h2>
          <p className="text-[#8A8A99] text-sm mb-6">No pudimos verificar tu sesión. Pedile a la academia que te reenvíe la invitación.</p>
          <Link href="/" className="inline-block bg-[#C97A96] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#1A1A22] transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="font-playfair text-3xl font-bold text-[#1A1A22]">¡Bienvenida!</h2>
          <p className="text-[#8A8A99] text-sm mt-2">Configurá tu acceso y completá tus datos.</p>
        </div>

        <div className="space-y-4">
          <input required type="password" placeholder="Elegí tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
            <input required placeholder="Apellido" value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          </div>
          <input required type="tel" placeholder="WhatsApp (Ej: 351...)" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          <input required type="date" value={formData.fecha_nacimiento} onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          <label className="flex items-start gap-3 p-4 bg-[#FDF0F4]/50 rounded-2xl cursor-pointer border border-dashed border-[#E8A0B4]/30">
            <input type="checkbox" checked={formData.autoriza_imagen} onChange={(e) => setFormData({ ...formData, autoriza_imagen: e.target.checked })} className="mt-1 accent-[#C97A96]" />
            <span className="text-sm text-[#4A4A55]">Autorizo el uso de mi imagen para fines publicitarios de la academia.</span>
          </label>
        </div>

        <button disabled={loading} className="w-full mt-8 bg-[#1A1A22] text-white py-4 rounded-2xl font-bold hover:bg-[#C97A96] transition-all">
          {loading ? "Guardando..." : "Finalizar registro"}
        </button>
      </form>
    </div>
  );
}
