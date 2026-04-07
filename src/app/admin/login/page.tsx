"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "set-password" | "success";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace("#", ""));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (type === "invite" && accessToken && refreshToken) {
      // Establecer sesión con el token de invitación y mostrar form de contraseña
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }: { error: { message: string } | null }) => {
          if (sessionError) {
            setError("El link de invitación no es válido o ya expiró.");
          } else {
            // Limpiar hash de la URL sin recargar la página
            window.history.replaceState(null, "", window.location.pathname);
            setMode("set-password");
          }
        });
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
        setError("No se pudo iniciar sesión.");
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch {
      setError("Error interno del servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMode("success");
    setTimeout(() => {
      window.location.href = "/admin/dashboard";
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-linear-to-br from-negro to-[#2A1F2E]">
      <div className="bg-white/5 border border-rosa/15 rounded-3xl p-11 w-full max-w-100 backdrop-blur-md">
        <div className="font-playfair text-3xl font-semibold text-white text-center mb-1">
          R.G <span className="text-rosa">Danza</span>
        </div>
        <div className="text-center text-sm text-white/35 mb-8 tracking-wide">
          Panel de administración
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-rosa/20 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-rosa/50"
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                required
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-rosa/20 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-rosa/50"
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rosa-d text-white rounded-full py-3.5 text-sm font-semibold hover:bg-gris disabled:opacity-50 transition-colors"
            >
              {loading ? "Verificando..." : "Ingresar al panel"}
            </button>
          </form>
        )}

        {mode === "set-password" && (
          <>
            <h2 className="text-white font-semibold text-lg text-center mb-1">
              Activar cuenta
            </h2>
            <p className="text-white/40 text-sm text-center mb-6">
              Elegí una contraseña para acceder al panel.
            </p>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <input
                type="password"
                required
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-rosa/20 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-rosa/50"
              />
              <input
                type="password"
                required
                placeholder="Repetir contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-rosa/20 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-rosa/50"
              />
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl text-center">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rosa-d text-white rounded-full py-3.5 text-sm font-semibold hover:bg-gris disabled:opacity-50 transition-colors"
              >
                {loading ? "Guardando..." : "Activar cuenta"}
              </button>
            </form>
          </>
        )}

        {mode === "success" && (
          <div className="text-center">
            <div className="text-5xl mb-4">✓</div>
            <p className="text-white font-semibold text-lg mb-1">¡Cuenta activada!</p>
            <p className="text-white/40 text-sm">Redirigiendo al panel...</p>
          </div>
        )}
      </div>
    </div>
  );
}
