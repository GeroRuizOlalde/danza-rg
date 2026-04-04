"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DIAS_ABIERTOS_DEFAULT, DIAS_SEMANA_ORDENADOS, sanitizeDiasAbiertos } from "@/lib/academia";
import { supabase } from "@/lib/supabase";
import {
  actualizarAcademiaAdminAction,
  actualizarAdminDisplayNameAction,
} from "../actions";

type AcademiaState = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  instagram: string;
  dias_abiertos: string[];
};

const ACADEMIA_DEFAULT: AcademiaState = {
  id: "",
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  instagram: "",
  dias_abiertos: [...DIAS_ABIERTOS_DEFAULT],
};

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<"perfil" | "academia">("perfil");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [perfil, setPerfil] = useState({ nombre: "", email: "" });
  const [academia, setAcademia] = useState<AcademiaState>(ACADEMIA_DEFAULT);

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setPerfil({
            email: user.email || "",
            nombre: user.user_metadata?.display_name || "",
          });
        }

        const { data: infoAcademia } = await supabase.from("academia_info").select("*").single();

        if (infoAcademia) {
          setAcademia({
            id: infoAcademia.id || "",
            nombre: infoAcademia.nombre || "",
            telefono: infoAcademia.telefono || "",
            email: infoAcademia.email || "",
            direccion: infoAcademia.direccion || "",
            instagram: infoAcademia.instagram || "",
            dias_abiertos: sanitizeDiasAbiertos(infoAcademia.dias_abiertos),
          });
        }
      } catch (error) {
        console.error("Error al cargar configuracion:", error);
      } finally {
        setCargando(false);
      }
    }

    void fetchData();
  }, []);

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const result = await actualizarAdminDisplayNameAction(perfil.nombre);

    setGuardando(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Perfil actualizado.");
  };

  const handleGuardarAcademia = async (e: React.FormEvent) => {
    e.preventDefault();

    if (academia.dias_abiertos.length === 0) {
      toast.error("Selecciona al menos un dia abierto.");
      return;
    }

    setGuardando(true);

    const result = await actualizarAcademiaAdminAction({
      id: academia.id,
      nombre: academia.nombre,
      telefono: academia.telefono,
      email: academia.email,
      direccion: academia.direccion,
      instagram: academia.instagram,
      dias_abiertos: academia.dias_abiertos,
    });

    setGuardando(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Datos de la academia actualizados.");
  };

  const toggleDiaAbierto = (dia: string) => {
    setAcademia((current) => ({
      ...current,
      dias_abiertos: DIAS_SEMANA_ORDENADOS.filter((item) =>
        item === dia ? !current.dias_abiertos.includes(dia) : current.dias_abiertos.includes(item)
      ),
    }));
  };

  if (cargando) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-[#8A8A99]">
        Cargando configuracion...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
          Configuracion <em className="italic text-[#C97A96]">General</em>
        </h1>
        <p className="text-[0.83rem] text-[#8A8A99] mt-1">
          Administra tu cuenta y la informacion publica del estudio
        </p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-[#E8A0B4]/20 pb-px">
        <button
          onClick={() => setTab("perfil")}
          className={`pb-3 px-2 text-[0.85rem] font-semibold transition-all border-b-2 ${
            tab === "perfil"
              ? "border-[#C97A96] text-[#C97A96]"
              : "border-transparent text-[#8A8A99] hover:text-[#4A4A55]"
          }`}
        >
          Mi Perfil
        </button>
        <button
          onClick={() => setTab("academia")}
          className={`pb-3 px-2 text-[0.85rem] font-semibold transition-all border-b-2 ${
            tab === "academia"
              ? "border-[#C97A96] text-[#C97A96]"
              : "border-transparent text-[#8A8A99] hover:text-[#4A4A55]"
          }`}
        >
          Datos de la Academia
        </button>
      </div>

      {tab === "perfil" && (
        <form
          onSubmit={handleGuardarPerfil}
          className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-7 shadow-sm"
        >
          <h2 className="text-[1.1rem] font-semibold text-[#1A1A22] mb-5">
            Informacion personal
          </h2>
          <div className="grid gap-5 max-w-md">
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Tu nombre visible en el panel
              </label>
              <input
                type="text"
                value={perfil.nombre}
                onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
              />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Email de acceso
              </label>
              <input
                type="email"
                disabled
                value={perfil.email}
                className="w-full border-[1.5px] border-[#E8A0B4]/10 bg-gray-50 rounded-xl px-4 py-2.5 text-[0.9rem] text-gray-400 outline-none cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="mt-2 w-fit bg-[#C97A96] text-white px-7 py-2.5 rounded-full text-[0.85rem] font-medium hover:bg-[#1A1A22] transition-all disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar perfil"}
            </button>
          </div>
        </form>
      )}

      {tab === "academia" && (
        <form
          onSubmit={handleGuardarAcademia}
          className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-7 shadow-sm"
        >
          <h2 className="text-[1.1rem] font-semibold text-[#1A1A22] mb-1">
            Informacion publica
          </h2>
          <p className="text-[0.8rem] text-[#8A8A99] mb-5">
            Estos datos se muestran en la web publica.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Nombre de la academia
              </label>
              <input
                type="text"
                value={academia.nombre}
                onChange={(e) => setAcademia({ ...academia, nombre: e.target.value })}
                className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
              />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Instagram
              </label>
              <input
                type="text"
                value={academia.instagram}
                onChange={(e) => setAcademia({ ...academia, instagram: e.target.value })}
                className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
              />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Telefono o WhatsApp publico
              </label>
              <input
                type="text"
                value={academia.telefono}
                onChange={(e) => setAcademia({ ...academia, telefono: e.target.value })}
                className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
              />
            </div>
            <div>
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Email de contacto publico
              </label>
              <input
                type="email"
                value={academia.email}
                onChange={(e) => setAcademia({ ...academia, email: e.target.value })}
                className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Direccion fisica
              </label>
              <input
                type="text"
                value={academia.direccion}
                onChange={(e) => setAcademia({ ...academia, direccion: e.target.value })}
                className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                Dias en los que abre la academia
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DIAS_SEMANA_ORDENADOS.map((dia) => {
                  const activo = academia.dias_abiertos.includes(dia);

                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDiaAbierto(dia)}
                      className={`rounded-xl border px-4 py-3 text-left text-[0.85rem] font-medium transition-all ${
                        activo
                          ? "border-[#C97A96] bg-[#FDF0F4] text-[#C97A96]"
                          : "border-[#E8A0B4]/20 bg-white text-[#4A4A55] hover:border-[#C97A96]/40"
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.72rem] text-[#8A8A99] mt-2">
                Esta configuracion define que dias se pueden cargar en la grilla de
                horarios y cuales se muestran en la web.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-[#E8A0B4]/20 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="bg-[#1A1A22] text-white px-8 py-2.5 rounded-full text-[0.85rem] font-medium hover:bg-[#C97A96] transition-all disabled:opacity-50"
            >
              {guardando ? "Actualizando web..." : "Guardar y actualizar web"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
