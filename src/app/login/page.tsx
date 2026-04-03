"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";

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
        setError("Necesitás confirmar tu email antes de ingresar.");
        return;
      }

      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }

      const role = data.user?.app_metadata?.role || data.user?.user_metadata?.role;
      window.location.href = role === "admin" ? "/admin/dashboard" : "/perfil";
    } catch {
      setError("Error interno del servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F9]">
      <Navbar />
      <div className="pt-[120px] pb-20 px-6 flex items-center justify-center">
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-[420px] shadow-sm border border-[#E8A0B4]/10">
          <div className="text-center mb-8">
            <h1 className="font-playfair text-3xl font-bold text-[#1A1A22]">Iniciá <em className="text-[#C97A96] not-italic">sesión</em></h1>
            <p className="text-[#8A8A99] text-sm mt-2">Accedé a tu perfil y a tus reservas.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm" />
            <input type="password" required placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm" />
            {error && <div className="bg-red-50 border border-red-100 text-red-500 text-sm p-3 rounded-2xl text-center">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-[#1A1A22] text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-[#C97A96] disabled:opacity-50">
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[#8A8A99] text-xs">¿Todavía no tenés cuenta? La academia te envía una invitación por email.</p>
            <Link href="/turnero" className="inline-block mt-3 text-[#C97A96] text-sm font-semibold hover:underline">
              Reservar clase de prueba sin cuenta →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F7F7F9] text-[#8A8A99]">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
