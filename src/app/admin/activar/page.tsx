"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Step = "loading" | "set-password" | "success" | "error";

export default function ActivarCuentaPage() {
  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // El callback /auth/callback ya intercambió el code por una sesión.
    // Solo verificamos que haya sesión activa.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setErrorMsg("El link de invitación no es válido o ya expiró.");
        setStep("error");
      } else {
        setStep("set-password");
      }
    });
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setGuardando(false);
      return;
    }

    setStep("success");
    setTimeout(() => {
      window.location.href = "/admin/dashboard";
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-negro to-[#2A1F2E] p-4">
      <div className="bg-white/5 border border-rosa/15 rounded-3xl p-10 w-full max-w-100 backdrop-blur-md">
        <div className="font-playfair text-3xl font-semibold text-white text-center mb-1">
          R.G <span className="text-rosa">Danza</span>
        </div>
        <div className="text-center text-sm text-white/35 mb-8 tracking-wide">
          Panel de administración
        </div>

        {step === "loading" && (
          <p className="text-center text-white/50 text-sm">Verificando invitación...</p>
        )}

        {step === "set-password" && (
          <>
            <h2 className="text-white font-semibold text-lg text-center mb-1">
              Activar cuenta
            </h2>
            <p className="text-white/40 text-sm text-center mb-6">
              Elegí una contraseña para acceder al panel.
            </p>
            <form onSubmit={handleGuardar} className="space-y-4">
              <input
                type="password"
                required
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-rosa/20 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-rosa/50"
              />
              <input
                type="password"
                required
                placeholder="Repetir contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white/5 border border-rosa/20 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-rosa/50"
              />
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl text-center">
                  {errorMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-rosa-d text-white rounded-full py-3.5 text-sm font-semibold hover:bg-gris transition-colors disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Activar cuenta"}
              </button>
            </form>
          </>
        )}

        {step === "success" && (
          <div className="text-center">
            <div className="text-5xl mb-4">✓</div>
            <p className="text-white font-semibold text-lg mb-1">¡Cuenta activada!</p>
            <p className="text-white/40 text-sm">Redirigiendo al panel...</p>
          </div>
        )}

        {step === "error" && (
          <div className="text-center">
            <div className="text-5xl mb-4">✕</div>
            <p className="text-white font-semibold mb-2">Link inválido</p>
            <p className="text-white/40 text-sm mb-6">{errorMsg}</p>
            <a
              href="/admin/login"
              className="text-rosa text-sm hover:underline"
            >
              Ir al login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
