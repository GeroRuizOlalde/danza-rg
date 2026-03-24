"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Intentamos entrar con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // 2. Si Supabase nos patea (Error 400), atajamos el error acá
      if (error) {
        setError(`Error: ${error.message === "Invalid login credentials" ? "Email o contraseña incorrectos." : error.message}`);
        setLoading(false); // Liberamos el botón
        return; // Cortamos la ejecución
      }

      // 3. Si llegamos acá, ¡hay sesión exitosa!
      if (data.session) {
        window.location.href = "/admin/dashboard";
      } else {
        // Por si Supabase devuelve éxito pero sin sesión (pasa a veces con correos sin confirmar)
        setError("Falta confirmar el email en Supabase.");
        setLoading(false);
      }

    } catch (err: any) {
      console.error(err);
      setError("Error interno del servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1A1A22] to-[#2A1F2E]">
      <div className="absolute -top-[200px] -left-[200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(232,160,180,0.12)_0%,transparent_65%)] pointer-events-none"></div>
      <div className="absolute -bottom-[150px] -right-[150px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(201,122,150,0.1)_0%,transparent_65%)] pointer-events-none"></div>

      <div className="bg-white/5 border border-[#E8A0B4]/15 rounded-3xl p-11 w-full max-w-[400px] backdrop-blur-md relative z-10">
        <div className="font-playfair text-3xl font-semibold text-white text-center mb-1">
          R.G <span className="text-[#E8A0B4]">Danza</span>
        </div>
        <div className="text-center text-[0.78rem] text-white/35 mb-8 tracking-wide">
          Panel de administración
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-[0.75rem] font-medium text-white/45 mb-1.5 tracking-wide">Email</label>
            <input 
              type="email" 
              required
              placeholder="tu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-[#E8A0B4]/20 rounded-xl px-4 py-3 text-[0.9rem] text-white outline-none placeholder-white/20 focus:border-[#C97A96] transition-all"
            />
          </div>
          <div className="mb-6">
            <label className="block text-[0.75rem] font-medium text-white/45 mb-1.5 tracking-wide">Contraseña</label>
            <input 
              type="password" 
              required
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-[#E8A0B4]/20 rounded-xl px-4 py-3 text-[0.9rem] text-white outline-none placeholder-white/20 focus:border-[#C97A96] transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[0.8rem] p-3 rounded-xl mb-4 text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#C97A96] text-white rounded-full py-3.5 text-[0.9rem] font-semibold hover:bg-[#4A4A55] transition-all shadow-[0_4px_20px_rgba(201,122,150,0.35)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Ingresar al panel →"}
          </button>
        </form>
      </div>
    </div>
  );
}