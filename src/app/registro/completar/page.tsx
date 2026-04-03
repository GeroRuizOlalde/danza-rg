"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { finalizarCuentaClienteAction } from "@/app/actions/cuenta";
import { supabase } from "@/lib/supabase";

const REGISTRO_PREFILL_KEY = "turnero-registro-prefill";

type CompletionState =
  | { status: "loading"; message: string }
  | { status: "success"; linkedCount: number }
  | { status: "error"; message: string };

export default function CompletarRegistroPage() {
  const router = useRouter();
  const [state, setState] = useState<CompletionState>({
    status: "loading",
    message: "Verificando tu cuenta...",
  });

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const hash = window.location.hash;

        if (hash.includes("access_token")) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              throw error;
            }

            window.history.replaceState(null, "", window.location.pathname);
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "No pudimos validar tu sesión. Abrí el enlace del email o iniciá sesión para continuar."
          );
        }

        if (!active) {
          return;
        }

        setState({
          status: "loading",
          message: "Preparando tu perfil y vinculando tu turno...",
        });

        const result = await finalizarCuentaClienteAction();

        if (!result.success) {
          throw new Error(result.error || "No pudimos terminar de crear tu cuenta.");
        }

        window.sessionStorage.removeItem(REGISTRO_PREFILL_KEY);

        if (!active) {
          return;
        }

        setState({
          status: "success",
          linkedCount: result.linkedCount || 0,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No pudimos completar el registro.",
        });
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FDF0F4] flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-xl w-full text-center">
        {state.status === "loading" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-[#FDF0F4] flex items-center justify-center text-4xl mb-6">
              ⏳
            </div>
            <h1 className="font-playfair text-3xl font-bold text-[#1A1A22] mb-3">
              Un segundo
            </h1>
            <p className="text-[#8A8A99] text-sm">{state.message}</p>
          </>
        )}

        {state.status === "success" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-[#FDF0F4] flex items-center justify-center text-4xl mb-6">
              ✨
            </div>
            <h1 className="font-playfair text-3xl font-bold text-[#1A1A22] mb-3">
              Cuenta lista
            </h1>
            <p className="text-[#8A8A99] text-sm leading-relaxed">
              {state.linkedCount > 0
                ? `Vinculamos ${state.linkedCount} turno${state.linkedCount === 1 ? "" : "s"} a tu perfil para que los tengas a mano.`
                : "Tu cuenta ya quedó preparada para que la próxima reserva sea más rápida."}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push("/perfil")}
                className="w-full bg-[#1A1A22] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#C97A96] transition-colors"
              >
                Ir a mi perfil
              </button>
              <Link
                href="/turnero"
                className="w-full bg-[#F7F7F9] text-[#1A1A22] px-6 py-3 rounded-full text-sm font-semibold"
              >
                Volver al turnero
              </Link>
            </div>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center text-4xl mb-6">
              ⚠️
            </div>
            <h1 className="font-playfair text-3xl font-bold text-[#1A1A22] mb-3">
              No pudimos completar el registro
            </h1>
            <p className="text-[#8A8A99] text-sm leading-relaxed">{state.message}</p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/registro"
                className="w-full bg-[#C97A96] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#1A1A22] transition-colors"
              >
                Volver a crear la cuenta
              </Link>
              <Link
                href="/login"
                className="w-full bg-[#F7F7F9] text-[#1A1A22] px-6 py-3 rounded-full text-sm font-semibold"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
