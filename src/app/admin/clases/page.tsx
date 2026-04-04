"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import {
  eliminarClaseAdminAction,
  guardarClaseConImagenAdminAction,
} from "../actions";

type Clase = {
  id: string;
  nombre: string;
  etiqueta: string;
  edades: string;
  descripcion: string;
  imagen_url: string;
  estado: string;
};

type ClaseFormState = {
  nombre: string;
  etiqueta: string;
  edades: string;
  descripcion: string;
  imagen_url: string;
  estado: string;
};

const EMPTY_FORM: ClaseFormState = {
  nombre: "",
  etiqueta: "",
  edades: "",
  descripcion: "",
  imagen_url: "",
  estado: "activa",
};

function ClasePreview({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setImageSrc(src);
  }, [src]);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="h-full w-full object-cover"
      onError={() =>
        setImageSrc(
          "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80"
        )
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
  const [formData, setFormData] = useState<ClaseFormState>(EMPTY_FORM);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetchClases();
  }, []);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setSelectedImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImage]);

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

  function resetImageState() {
    setSelectedImage(null);
    setSelectedImagePreview("");
    setRemoveCurrentImage(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleOpenModal(clase?: Clase) {
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
      setFormData(EMPTY_FORM);
    }

    resetImageState();
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    resetImageState();
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedImage(file);
    setRemoveCurrentImage(false);
  }

  function handleDiscardNewImage() {
    setSelectedImage(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleRemoveCurrentImage() {
    handleDiscardNewImage();
    setRemoveCurrentImage(true);
  }

  function handleRestoreCurrentImage() {
    setRemoveCurrentImage(false);
  }

  async function handleGuardar(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const submission = new FormData();

      if (editingId) {
        submission.set("id", editingId);
      }

      submission.set("nombre", formData.nombre);
      submission.set("etiqueta", formData.etiqueta);
      submission.set("edades", formData.edades);
      submission.set("descripcion", formData.descripcion);
      submission.set("estado", formData.estado);
      submission.set("imagen_url_actual", formData.imagen_url);
      submission.set("removeCurrentImage", String(removeCurrentImage));

      if (selectedImage) {
        submission.set("imagen", selectedImage);
      }

      const result = await guardarClaseConImagenAdminAction(submission);

      if (!result.success) {
        throw new Error(result.error);
      }

      await fetchClases();
      handleCloseModal();
      toast.success("Clase guardada.");
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error(
        error instanceof Error ? error.message : "Hubo un error al guardar la clase."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEliminar(id: string, nombre: string) {
    if (
      !window.confirm(
        `Estas segura de eliminar la clase "${nombre}"? Se borraran tambien sus horarios asociados.`
      )
    ) {
      return;
    }

    try {
      const result = await eliminarClaseAdminAction(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      setClases((current) => current.filter((clase) => clase.id !== id));
      toast.success("Clase eliminada.");
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error(
        error instanceof Error ? error.message : "Hubo un error al eliminar la clase."
      );
    }
  }

  const previewImageUrl =
    selectedImagePreview || (removeCurrentImage ? "" : formData.imagen_url);

  return (
    <div>
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestion de <em className="italic text-[#C97A96]">Clases</em>
          </h1>
          <p className="mt-1 text-[0.83rem] text-[#8A8A99]">
            Administra las disciplinas que se ensenan en la academia
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-full border-none bg-[#C97A96] px-5 py-2.5 text-[0.82rem] font-semibold text-white shadow-[0_4px_14px_rgba(201,122,150,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#4A4A55]"
        >
          + Nueva clase
        </button>
      </div>

      {cargando ? (
        <div className="flex h-[300px] items-center justify-center text-sm font-medium text-[#8A8A99]">
          Cargando clases...
        </div>
      ) : clases.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-[#E8A0B4]/20 bg-white text-[#8A8A99]">
          <div className="mb-3 text-4xl">Clases</div>
          <p className="text-[0.9rem] font-medium">No hay clases registradas aun</p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 text-sm font-medium text-[#C97A96] hover:underline"
          >
            Crear la primera clase
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className={`flex flex-col overflow-hidden rounded-2xl border border-[#E8A0B4]/20 bg-white transition-all hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(201,122,150,0.12)] ${
                clase.estado === "inactiva" ? "grayscale-[0.5] opacity-60" : ""
              }`}
            >
              <div className="relative h-[160px] overflow-hidden bg-gray-100">
                {clase.imagen_url ? (
                  <ClasePreview src={clase.imagen_url} alt={clase.nombre} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                    Sin imagen
                  </div>
                )}
                <div className="absolute left-3 top-3 flex gap-2">
                  <span className="rounded-full bg-white/90 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[#C97A96] shadow-sm backdrop-blur-sm">
                    {clase.etiqueta}
                  </span>
                  {clase.estado === "inactiva" && (
                    <span className="rounded-full bg-red-500/90 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                      Inactiva
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-1 font-playfair text-[1.2rem] font-semibold text-[#1A1A22]">
                  {clase.nombre}
                </h3>
                <p className="mb-3 text-[0.75rem] font-medium text-[#8A8A99]">
                  {clase.edades}
                </p>
                <p className="mb-4 line-clamp-3 flex-1 text-[0.8rem] text-[#4A4A55]">
                  {clase.descripcion || "Sin descripcion."}
                </p>

                <div className="flex gap-2 border-t border-[#E8A0B4]/20 pt-4">
                  <button
                    onClick={() => handleOpenModal(clase)}
                    className="flex-1 rounded-lg border border-[#E8A0B4]/30 py-1.5 text-[0.8rem] font-medium text-[#4A4A55] transition-colors hover:border-[#C97A96] hover:bg-[#FDF0F4] hover:text-[#C97A96]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(clase.id, clase.nombre)}
                    className="flex w-[40px] items-center justify-center rounded-lg border border-[#E8A0B4]/30 text-[0.8rem] text-[#4A4A55] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8A0B4]/20 bg-white/95 px-8 py-5 backdrop-blur">
              <h2 className="font-playfair text-2xl font-semibold text-[#1A1A22]">
                {editingId ? "Editar " : "Nueva "}
                <em className="italic text-[#C97A96]">Clase</em>
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-xl text-[#8A8A99] transition-colors hover:text-[#EF4444]"
              >
                X
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-8">
              <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[0.8rem] font-medium text-[#4A4A55]">
                    Nombre de la clase *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Danza Jazz"
                    value={formData.nombre}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        nombre: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-[1.5px] border-[#E8A0B4]/30 px-4 py-2.5 text-[0.9rem] outline-none transition-all focus:border-[#C97A96]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[0.8rem] font-medium text-[#4A4A55]">
                    Etiqueta corta *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Jazz"
                    value={formData.etiqueta}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        etiqueta: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-[1.5px] border-[#E8A0B4]/30 px-4 py-2.5 text-[0.9rem] outline-none transition-all focus:border-[#C97A96]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[0.8rem] font-medium text-[#4A4A55]">
                    Edades y niveles *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Desde 6 anos - Inicio y avanzado"
                    value={formData.edades}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        edades: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-[1.5px] border-[#E8A0B4]/30 px-4 py-2.5 text-[0.9rem] outline-none transition-all focus:border-[#C97A96]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[0.8rem] font-medium text-[#4A4A55]">
                    Descripcion publica
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe de que se trata la clase..."
                    value={formData.descripcion}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        descripcion: event.target.value,
                      }))
                    }
                    className="w-full resize-none rounded-xl border-[1.5px] border-[#E8A0B4]/30 px-4 py-2.5 text-[0.9rem] outline-none transition-all focus:border-[#C97A96]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[0.8rem] font-medium text-[#4A4A55]">
                    Imagen de la clase
                  </label>
                  <div className="rounded-2xl border border-dashed border-[#E8A0B4]/40 bg-[#FCF7F9] p-4">
                    <div className="relative h-[220px] overflow-hidden rounded-2xl bg-white">
                      {previewImageUrl ? (
                        <ClasePreview
                          src={previewImageUrl}
                          alt={formData.nombre || "Vista previa de la clase"}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#8A8A99]">
                          Subi una imagen para mostrar esta clase en la landing y en la
                          seccion publica.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full cursor-pointer rounded-xl border-[1.5px] border-[#E8A0B4]/30 bg-white px-4 py-2.5 text-[0.85rem] text-[#4A4A55] file:mr-3 file:rounded-full file:border-0 file:bg-[#FDF0F4] file:px-4 file:py-2 file:text-[0.8rem] file:font-semibold file:text-[#C97A96] hover:file:bg-[#F7D8E2]"
                      />

                      {selectedImage && (
                        <button
                          type="button"
                          onClick={handleDiscardNewImage}
                          className="rounded-full border border-[#E8A0B4]/30 px-4 py-2 text-[0.8rem] font-medium text-[#4A4A55] transition-colors hover:bg-white"
                        >
                          Descartar nueva imagen
                        </button>
                      )}

                      {!selectedImage && formData.imagen_url && !removeCurrentImage && (
                        <button
                          type="button"
                          onClick={handleRemoveCurrentImage}
                          className="rounded-full border border-red-200 px-4 py-2 text-[0.8rem] font-medium text-red-500 transition-colors hover:bg-red-50"
                        >
                          Quitar imagen actual
                        </button>
                      )}

                      {!selectedImage && formData.imagen_url && removeCurrentImage && (
                        <button
                          type="button"
                          onClick={handleRestoreCurrentImage}
                          className="rounded-full border border-[#E8A0B4]/30 px-4 py-2 text-[0.8rem] font-medium text-[#4A4A55] transition-colors hover:bg-white"
                        >
                          Restaurar imagen actual
                        </button>
                      )}
                    </div>

                    <p className="mt-3 text-[0.72rem] text-[#8A8A99]">
                      La imagen se sube al storage de la academia cuando guardas la
                      clase. Si reemplazas una imagen anterior, se limpia sola.
                    </p>
                    {removeCurrentImage && !selectedImage && formData.imagen_url && (
                      <p className="mt-2 text-[0.72rem] font-medium text-red-500">
                        La imagen actual se eliminara al guardar.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[0.8rem] font-medium text-[#4A4A55]">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        estado: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-[1.5px] border-[#E8A0B4]/30 bg-white px-4 py-2.5 text-[0.9rem] outline-none transition-all focus:border-[#C97A96]"
                  >
                    <option value="activa">Activa (visible en la web)</option>
                    <option value="inactiva">Inactiva (oculta)</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-3 border-t border-[#E8A0B4]/20 pt-5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full px-6 py-2.5 text-[0.85rem] font-medium text-[#8A8A99] transition-all hover:bg-[#F7F7F9]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-full bg-[#C97A96] px-8 py-2.5 text-[0.85rem] font-medium text-white transition-all hover:bg-[#1A1A22] disabled:opacity-50"
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
