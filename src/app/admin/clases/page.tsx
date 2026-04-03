"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { eliminarClaseAdminAction, guardarClaseAdminAction } from "../actions";

type Clase = {
  id: string;
  nombre: string;
  etiqueta: string;
  edades: string;
  descripcion: string;
  imagen_url: string;
  estado: string;
};

function ClasePreview({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      unoptimized
      sizes="(max-width: 768px) 100vw, 33vw"
      className="w-full h-full object-cover"
      onError={() =>
        setImageSrc("https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80")
      }
    />
  );
}

export default function ClasesPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    etiqueta: "",
    edades: "",
    descripcion: "",
    imagen_url: "",
    estado: "activa",
  });

  useEffect(() => {
    void fetchClases();
  }, []);

  async function fetchClases() {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from("clases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClases(data || []);
    } catch (error) {
      console.error("Error cargando clases:", error);
    } finally {
      setCargando(false);
    }
  }

  const handleOpenModal = (clase?: Clase) => {
    if (clase) {
      setEditingId(clase.id);
      setFormData({
        nombre: clase.nombre,
        etiqueta: clase.etiqueta,
        edades: clase.edades,
        descripcion: clase.descripcion || "",
        imagen_url: clase.imagen_url || "",
        estado: clase.estado,
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: "",
        etiqueta: "",
        edades: "",
        descripcion: "",
        imagen_url: "",
        estado: "activa",
      });
    }

    setIsModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await guardarClaseAdminAction({
        id: editingId || undefined,
        ...formData,
      });

      if (!result.success) throw new Error(result.error);

      await fetchClases();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Hubo un error al guardar la clase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!window.confirm(`Estas segura de eliminar la clase "${nombre}"? Se borraran tambien sus horarios asociados.`)) {
      return;
    }

    try {
      const result = await eliminarClaseAdminAction(id);
      if (!result.success) throw new Error(result.error);
      setClases(clases.filter((clase) => clase.id !== id));
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error("Hubo un error al eliminar la clase.");
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestion de <em className="italic text-[#C97A96]">Clases</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            Administra las disciplinas que se ensenan en la academia
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 bg-[#C97A96] text-white border-none rounded-full px-5 py-2.5 text-[0.82rem] font-semibold hover:bg-[#4A4A55] transition-all shadow-[0_4px_14px_rgba(201,122,150,0.28)] hover:-translate-y-0.5"
        >
          + Nueva clase
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-[300px] text-[#8A8A99] font-medium text-sm">
          Cargando clases...
        </div>
      ) : clases.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-[#8A8A99] bg-white border border-[#E8A0B4]/20 rounded-2xl">
          <div className="text-4xl mb-3">Clases</div>
          <p className="font-medium text-[0.9rem]">No hay clases registradas aun</p>
          <button onClick={() => handleOpenModal()} className="mt-4 text-[#C97A96] font-medium text-sm hover:underline">
            Crear la primera clase
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className={`bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(201,122,150,0.12)] transition-all flex flex-col ${
                clase.estado === "inactiva" ? "opacity-60 grayscale-[0.5]" : ""
              }`}
            >
              <div className="h-[160px] bg-gray-100 relative overflow-hidden">
                {clase.imagen_url ? (
                  <ClasePreview src={clase.imagen_url} alt={clase.nombre} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    Sin imagen
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="bg-white/90 backdrop-blur-sm text-[#C97A96] text-[0.65rem] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">
                    {clase.etiqueta}
                  </span>
                  {clase.estado === "inactiva" && (
                    <span className="bg-red-500/90 backdrop-blur-sm text-white text-[0.65rem] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">
                      Inactiva
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-playfair text-[1.2rem] font-semibold text-[#1A1A22] mb-1">
                  {clase.nombre}
                </h3>
                <p className="text-[0.75rem] font-medium text-[#8A8A99] mb-3">{clase.edades}</p>
                <p className="text-[0.8rem] text-[#4A4A55] line-clamp-3 mb-4 flex-1">
                  {clase.descripcion || "Sin descripcion."}
                </p>

                <div className="flex gap-2 pt-4 border-t border-[#E8A0B4]/20">
                  <button
                    onClick={() => handleOpenModal(clase)}
                    className="flex-1 border border-[#E8A0B4]/30 text-[#4A4A55] py-1.5 rounded-lg text-[0.8rem] font-medium hover:bg-[#FDF0F4] hover:text-[#C97A96] hover:border-[#C97A96] transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(clase.id, clase.nombre)}
                    className="w-[40px] border border-[#E8A0B4]/30 text-[#4A4A55] flex items-center justify-center rounded-lg text-[0.8rem] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Eliminar"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-8 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center z-10">
              <h2 className="font-playfair text-2xl font-semibold text-[#1A1A22]">
                {editingId ? "Editar " : "Nueva "}
                <em className="italic text-[#C97A96]">Clase</em>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8A8A99] hover:text-[#EF4444] text-xl transition-colors"
              >
                X
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Nombre de la clase *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Danza Jazz"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Etiqueta corta *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Jazz"
                    value={formData.etiqueta}
                    onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Edades y niveles *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Desde 6 anos - Inicio y avanzado"
                    value={formData.edades}
                    onChange={(e) => setFormData({ ...formData, edades: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Descripcion publica
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe de que se trata la clase..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    URL de la imagen
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imagen_url}
                    onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                  />
                  <p className="text-[0.7rem] text-[#8A8A99] mt-1">
                    Podes copiar la direccion de una imagen y pegarla aca.
                  </p>
                </div>

                <div>
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-2.5 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                  >
                    <option value="activa">Activa (visible en la web)</option>
                    <option value="inactiva">Inactiva (oculta)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-[#E8A0B4]/20 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-full text-[0.85rem] font-medium text-[#8A8A99] hover:bg-[#F7F7F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#C97A96] text-white px-8 py-2.5 rounded-full text-[0.85rem] font-medium hover:bg-[#1A1A22] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Guardando..." : "Guardar clase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
