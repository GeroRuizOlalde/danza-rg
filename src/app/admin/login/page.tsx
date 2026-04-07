"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Si Supabase redirigió aquí con tokens de invitación, ir a /admin/activar
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=invite") && hash.includes("access_token=")) {
      window.location.href = "/admin/activar" + hash;
    }
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message === "Invalid login credentials" ? "Email o contraseña incorrectos." : loginError.message);
        return;
      }

      if (!data.session) {
        setError("Falta confirmar el email en Supabase.");
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch {
      setError("Error interno del servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1A1A22] to-[#2A1F2E]">
      <div className="bg-white/5 border border-[#E8A0B4]/15 rounded-3xl p-11 w-full max-w-[400px] backdrop-blur-md">
        <div className="font-playfair text-3xl font-semibold text-white text-center mb-1">R.G <span className="text-[#E8A0B4]">Danza</span></div>
        <div className="text-center text-sm text-white/35 mb-8 tracking-wide">Panel de administración</div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <input type="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-[#E8A0B4]/20 rounded-xl px-4 py-3 text-white placeholder-white/20" />
          </div>
          <div className="mb-6">
            <input type="password" required placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-[#E8A0B4]/20 rounded-xl px-4 py-3 text-white placeholder-white/20" />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-[#C97A96] text-white rounded-full py-3.5 text-sm font-semibold hover:bg-[#4A4A55] disabled:opacity-50">
            {loading ? "Verificando..." : "Ingresar al panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
