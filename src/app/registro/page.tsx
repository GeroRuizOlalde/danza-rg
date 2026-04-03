"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

const REGISTRO_PREFILL_KEY = "turnero-registro-prefill";

type RegistroForm = {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegistroPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<RegistroForm>({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let active = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (user) {
        router.replace("/perfil");
        return;
      }

      const prefillRaw = window.sessionStorage.getItem(REGISTRO_PREFILL_KEY);

      if (prefillRaw) {
        try {
          const prefill = JSON.parse(prefillRaw) as Partial<RegistroForm>;
          setFormData((prev) => ({
            ...prev,
            nombre: prefill.nombre || "",
            apellido: prefill.apellido || "",
            telefono: prefill.telefono || "",
            email: prefill.email || "",
          }));
        } catch {
          window.sessionStorage.removeItem(REGISTRO_PREFILL_KEY);
        }
      }

      setCheckingSession(false);
    }

    void init();

    return () => {
      active = false;
    };
  }, [router]);

  const updateField = <K extends keyof RegistroForm>(field: K, value: RegistroForm[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.nombre.trim() || !formData.telefono.trim() || !formData.email.trim()) {
      setError("Completá nombre, WhatsApp y email para continuar.");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      window.sessionStorage.setItem(
        REGISTRO_PREFILL_KEY,
        JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          email: formData.email,
        })
      );

      const redirectTo = `${window.location.origin}/registro/completar`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            display_name: formData.nombre.trim(),
            last_name: formData.apellido.trim(),
            telefono: formData.telefono.trim(),
            registro_origen: "turnero",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setError("Ese email ya tiene una cuenta. Iniciá sesión para recuperar tu perfil.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.session) {
        router.replace("/registro/completar");
        return;
      }

      setSuccessEmail(formData.email.trim().toLowerCase());
    } catch {
      setError("No pudimos crear la cuenta en este momento.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#F7F7F9] flex items-center justify-center text-[#8A8A99]">
        Verificando acceso...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F9]">
      <Navbar />
      <div className="pt-[120px] pb-20 px-6">
        <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <section className="bg-[#1A1A22] text-white rounded-[2.5rem] p-8 md:p-10">
            <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[2px] text-[#F5D0DC] mb-6">
              Cuenta y perfil
            </div>
            <h1 className="font-playfair text-4xl leading-tight font-bold mb-4">
              Creá tu cuenta y vinculá tu turno
            </h1>
            <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-xl">
              Esto te ayuda a optimizar tiempo la próxima vez: tus datos quedan guardados,
              tu turno se asocia a tu perfil y después vas a poder seguir todo más fácil.
            </p>
            <div className="mt-8 space-y-4 text-sm text-white/75">
              <div className="flex gap-3">
                <span>01</span>
                <span>Tus próximos datos se completan más rápido al reservar.</span>
              </div>
              <div className="flex gap-3">
                <span>02</span>
                <span>El turno que acabás de sacar queda vinculado a tu cuenta.</span>
              </div>
              <div className="flex gap-3">
                <span>03</span>
                <span>Después podés entrar a tu perfil sin depender del WhatsApp.</span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-[#E8A0B4]/10">
            {successEmail ? (
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#FDF0F4] flex items-center justify-center text-4xl mb-6">
                  ✉️
                </div>
                <h2 className="font-playfair text-3xl font-bold text-[#1A1A22] mb-3">
                  Revisá tu email
                </h2>
                <p className="text-[#8A8A99] text-sm leading-relaxed">
                  Te enviamos un enlace a <strong>{successEmail}</strong>. Cuando lo
                  confirmes, vamos a terminar de crear tu cuenta y vincular tu turno
                  automáticamente.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <Link
                    href="/login"
                    className="w-full bg-[#1A1A22] text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-[#C97A96] transition-colors"
                  >
                    Ir a iniciar sesión
                  </Link>
                  <Link
                    href="/turnero"
                    className="w-full bg-[#F7F7F9] text-[#1A1A22] rounded-2xl py-3.5 text-sm font-bold"
                  >
                    Volver al turnero
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="font-playfair text-3xl font-bold text-[#1A1A22]">
                    Tu acceso
                  </h2>
                  <p className="text-[#8A8A99] text-sm mt-2">
                    Completá estos datos una sola vez y te ahorrás tiempo en las próximas
                    reservas.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      required
                      placeholder="Nombre"
                      value={formData.nombre}
                      onChange={(event) => updateField("nombre", event.target.value)}
                      className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm"
                    />
                    <input
                      placeholder="Apellido"
                      value={formData.apellido}
                      onChange={(event) => updateField("apellido", event.target.value)}
                      className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm"
                    />
                  </div>
                  <input
                    required
                    type="tel"
                    placeholder="WhatsApp (Ej: 351...)"
                    value={formData.telefono}
                    onChange={(event) => updateField("telefono", event.target.value)}
                    className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm"
                  />
                  <input
                    required
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      required
                      type="password"
                      placeholder="Contraseña"
                      value={formData.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm"
                    />
                    <input
                      required
                      type="password"
                      placeholder="Repetir contraseña"
                      value={formData.confirmPassword}
                      onChange={(event) =>
                        updateField("confirmPassword", event.target.value)
                      }
                      className="w-full bg-[#F7F7F9] rounded-2xl px-5 py-3.5 text-sm"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-500 text-sm p-3 rounded-2xl text-center">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#C97A96] text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-[#1A1A22] disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Creando cuenta..." : "Crear cuenta y vincular turno"}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
                  <p className="text-[#8A8A99] text-xs">
                    ¿Ya tenés cuenta? Iniciá sesión y vas a poder seguir desde tu perfil.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/login"
                      className="text-[#C97A96] text-sm font-semibold hover:underline"
                    >
                      Ya tengo cuenta
                    </Link>
                    <Link
                      href="/turnero"
                      className="text-[#8A8A99] text-sm hover:underline"
                    >
                      Volver al turnero
                    </Link>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
