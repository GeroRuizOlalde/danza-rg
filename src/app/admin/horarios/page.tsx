"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { isDiaAbierto, sanitizeDiasAbiertos } from "@/lib/academia";
import { supabase } from "@/lib/supabase";
import { eliminarHorarioAdminAction, guardarHorarioAdminAction } from "../actions";

type Clase = { id: string; nombre: string };

type Horario = {
  id: string;
  clase_id: string;
  sala: number;
  dia: string;
  hora: number;
  nivel: string | null;
  cupo_maximo: number;
  clases?: { nombre: string };
};

const HORAS = [17, 18, 19, 20, 21];

export default function HorariosPage() {
  const [sala, setSala] = useState<1 | 2>(1);
  const [clases, setClases] = useState<Clase[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [diasAbiertos, setDiasAbiertos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [celdaActual, setCeldaActual] = useState<{
    dia: string;
    hora: number;
    horarioExistente?: Horario;
  } | null>(null);
  const [formData, setFormData] = useState({
    clase_id: "",
    nivel: "",
    cupo_maximo: "20",
  });

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setCargando(true);

    try {
      const [{ data: dataClases }, { data: dataHorarios }, { data: dataAcademia }] = await Promise.all([
        supabase.from("clases").select("id, nombre").order("nombre"),
        supabase.from("horarios").select("*, clases(nombre)"),
        supabase.from("academia_info").select("*").single(),
      ]);

      if (dataClases) setClases(dataClases);
      if (dataHorarios) setHorarios(dataHorarios);
      setDiasAbiertos(sanitizeDiasAbiertos(dataAcademia?.dias_abiertos));
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setCargando(false);
    }
  }

  const handleCellClick = (dia: string, hora: number) => {
    const horarioExistente = horarios.find((item) => item.dia === dia && item.hora === hora && item.sala === sala);

    setCeldaActual({ dia, hora, horarioExistente });
    setFormData({
      clase_id: horarioExistente?.clase_id || "",
      nivel: horarioExistente?.nivel || "",
      cupo_maximo: String(horarioExistente?.cupo_maximo ?? 20),
    });
    setIsModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!celdaActual) return;

    setGuardando(true);

    try {
      if (formData.clase_id === "") {
        if (celdaActual.horarioExistente) {
          const result = await eliminarHorarioAdminAction(celdaActual.horarioExistente.id);

          if (!result.success) {
            toast.error(result.error);
            return;
          }
        }
      } else {
        const result = await guardarHorarioAdminAction({
          id: celdaActual.horarioExistente?.id,
          clase_id: formData.clase_id,
          sala,
          dia: celdaActual.dia,
          hora: celdaActual.hora,
          nivel: formData.nivel,
          cupo_maximo: parseInt(formData.cupo_maximo, 10) || 20,
        });

        if (!result.success) {
          toast.error(result.error);
          return;
        }
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando horario:", error);
      toast.error("Error al guardar el horario.");
    } finally {
      setGuardando(false);
    }
  };

  const handleLimpiarCelda = async () => {
    if (!celdaActual?.horarioExistente) return;

    setGuardando(true);

    const result = await eliminarHorarioAdminAction(celdaActual.horarioExistente.id);

    if (!result.success) {
      toast.error(result.error);
      setGuardando(false);
      return;
    }

    await fetchData();
    setGuardando(false);
    setIsModalOpen(false);
  };

  const horariosFueraDeConfiguracion = horarios.filter(
    (horario) => !isDiaAbierto(horario.dia, diasAbiertos)
  );

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
          Grilla de <em className="italic text-[#C97A96]">Horarios</em>
        </h1>
        <p className="text-[0.83rem] text-[#8A8A99] mt-1">
          Hace clic en cualquier espacio de la tabla para asignar una clase.
        </p>
      </div>

      {horariosFueraDeConfiguracion.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[0.85rem] text-amber-900">
          <strong className="block text-[0.9rem] font-semibold">
            Hay horarios cargados en dias que hoy figuran como cerrados.
          </strong>
          <p className="mt-1">
            Esos horarios no se muestran en esta grilla ni en la web publica hasta que
            vuelvas a habilitar esos dias en configuracion.
          </p>
          <p className="mt-2 text-[0.78rem]">
            Dias detectados:{" "}
            {Array.from(new Set(horariosFueraDeConfiguracion.map((horario) => horario.dia))).join(", ")}
          </p>
          <Link href="/admin/configuracion" className="mt-3 inline-flex font-semibold underline">
            Ir a configuracion
          </Link>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {([1, 2] as const).map((numeroSala) => (
          <button
            key={numeroSala}
            onClick={() => setSala(numeroSala)}
            className={`px-6 py-2 rounded-full text-[0.85rem] font-semibold transition-all ${
              sala === numeroSala
                ? "bg-[#C97A96] text-white shadow-md"
                : "bg-white border border-[#E8A0B4]/30 text-[#4A4A55] hover:bg-[#FDF0F4]"
            }`}
          >
            Sala {numeroSala}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex h-[400px] items-center justify-center text-[#8A8A99]">
          Cargando grilla...
        </div>
      ) : (
        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-[#F7F7F9] border-b border-[#E8A0B4]/20">
                <th className="py-4 px-4 font-semibold text-[#1A1A22] text-[0.85rem] w-[80px] text-center">
                  HS
                </th>
                {diasAbiertos.map((dia) => (
                  <th
                    key={dia}
                    className="py-4 px-3 font-semibold text-[#1A1A22] text-[0.85rem] uppercase tracking-wider text-center w-[18%]"
                  >
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORAS.map((hora) => (
                <tr key={hora} className="border-b border-[#E8A0B4]/10 last:border-none">
                  <td className="py-3 px-4 font-bold text-[#C97A96] text-[1.1rem] text-center bg-[#FDF0F4]/30 border-r border-[#E8A0B4]/10">
                    {hora}
                  </td>
                  {diasAbiertos.map((dia) => {
                    const celda = horarios.find((item) => item.dia === dia && item.hora === hora && item.sala === sala);

                    return (
                      <td key={`${dia}-${hora}`} className="p-2 border-r border-[#E8A0B4]/10 last:border-none">
                        <div
                          onClick={() => handleCellClick(dia, hora)}
                          className={`h-full min-h-[85px] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all border-2 ${
                            celda
                              ? "bg-[#FDF0F4] border-transparent hover:border-[#C97A96]/30"
                              : "bg-transparent border-dashed border-gray-200 hover:border-[#C97A96]/50 hover:bg-gray-50"
                          }`}
                        >
                          {celda ? (
                            <>
                              <strong className="text-[0.85rem] text-[#1A1A22] font-semibold leading-tight mb-0.5">
                                {celda.clases?.nombre || "Clase borrada"}
                              </strong>
                              {celda.nivel && (
                                <span className="text-[0.7rem] text-[#C97A96] font-medium leading-tight">
                                  {celda.nivel}
                                </span>
                              )}
                              <span className="text-[0.6rem] text-[#8A8A99] mt-1">
                                Cupo: {celda.cupo_maximo}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-300 text-[1.2rem] font-light">+</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && celdaActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <div>
                <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">
                  Sala {sala}
                </h3>
                <p className="text-[0.8rem] text-[#8A8A99] font-medium uppercase tracking-wide">
                  {celdaActual.dia} a las {celdaActual.hora}:00 hs
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#C97A96] hover:text-[#EF4444] text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6">
              <div className="mb-4">
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                  Clase a dictar
                </label>
                <select
                  value={formData.clase_id}
                  onChange={(e) => setFormData({ ...formData, clase_id: e.target.value })}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="">-- Sin clase (Libre) --</option>
                  {clases.map((clase) => (
                    <option key={clase.id} value={clase.id}>
                      {clase.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {formData.clase_id && (
                <>
                  <div className="mb-4">
                    <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                      Nivel o edades
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Baby, Infantil, Adultos..."
                      value={formData.nivel}
                      onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                      className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                      Cupo maximo
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={formData.cupo_maximo}
                      onChange={(e) => setFormData({ ...formData, cupo_maximo: e.target.value })}
                      className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                    />
                    <p className="text-[0.65rem] text-[#8A8A99] mt-1">
                      Cantidad de alumnas que pueden reservar este horario.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                {celdaActual.horarioExistente && (
                  <button
                    type="button"
                    onClick={handleLimpiarCelda}
                    className="px-4 py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[0.85rem] font-semibold hover:bg-red-100 transition-colors"
                    title="Vaciar celda"
                  >
                    Eliminar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-[#C97A96] text-white py-3 rounded-xl text-[0.9rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
