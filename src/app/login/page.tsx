"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function StudentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isRegister) {
      // REGISTRO (Para alumnas nuevas que se registran solas)
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/perfil/completar`,
        }
      });
      if (error) alert(error.message);
      else {
        alert("¡Cuenta creada! Revisá tu mail para confirmar e ingresar.");
        // No redirigimos todavía porque debe confirmar el email
      }
    } else {
      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Credenciales inválidas o cuenta no confirmada.");
      else router.push("/turnero");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) return alert("Por favor, ingresá tu email primero en el campo de arriba.");
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/perfil/completar`,
    });
    
    if (error) alert(error.message);
    else alert("Te enviamos un mail para restablecer tu contraseña. Revisá tu bandeja de entrada.");
  };

  return (
    <div className="min-h-screen bg-[#FDF0F4] flex flex-col font-dm-sans">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6 mt-10">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl overflow-hidden border border-[#E8A0B4]/20">
          <div className="p-8 pt-12 text-center">
            <h1 className="font-playfair text-3xl font-bold text-[#1A1A22] mb-2">
              {isRegister ? "Unite a la academia" : "¡Hola de nuevo!"}
            </h1>
            <p className="text-[#8A8A99] text-[0.85rem] mb-8 leading-relaxed">
              {isRegister 
                ? "Creá tu cuenta para gestionar tus clases y turnos." 
                : "Ingresá con tu email y contraseña para reservar."}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="text-left">
                <label className="text-[0.7rem] font-bold text-[#C97A96] uppercase ml-1">Email</label>
                <input 
                  type="email" placeholder="ejemplo@mail.com" required
                  className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3.5 outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50 text-sm"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="text-left">
                <label className="text-[0.7rem] font-bold text-[#C97A96] uppercase ml-1">Contraseña</label>
                <input 
                  type="password" placeholder="••••••••" required
                  className="w-full border border-[#E8A0B4]/30 rounded-2xl px-5 py-3.5 outline-none focus:border-[#C97A96] transition-all bg-[#F7F7F9]/50 text-sm"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
              
              <button 
                disabled={loading}
                className="w-full bg-[#1A1A22] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#C97A96] transition-all shadow-lg uppercase tracking-widest disabled:opacity-50 mt-2"
              >
                {loading ? "Procesando..." : (isRegister ? "Crear cuenta ✦" : "Entrar a mi cuenta ✦")}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-3">
              <button 
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm text-[#4A4A55] font-medium hover:text-[#C97A96] transition-colors"
              >
                {isRegister ? "¿Ya tenés cuenta? Iniciá sesión" : "¿Sos nueva? Registrate acá"}
              </button>

              {!isRegister && (
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[0.75rem] text-[#8A8A99] hover:underline"
                >
                  Olvidé mi contraseña
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-[#F7F7F9] p-6 text-center border-t border-[#E8A0B4]/10">
             <Link href="/" className="text-xs text-[#8A8A99] hover:text-[#C97A96]">
                ← Volver al inicio
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}