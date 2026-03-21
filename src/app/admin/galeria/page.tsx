"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Foto = {
  id: string;
  url: string;
  orden: number;
  categoria: string;
};

const CATEGORIAS = ["Academia", "Clases", "Certámenes"];
const FILTROS = ["Todas", ...CATEGORIAS];

export default function GestionGaleriaPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<string>("Academia");
  const [filtroActivo, setFiltroActivo] = useState("Todas");

  useEffect(() => {
    fetchFotos();
  }, []);

  async function fetchFotos() {
    setCargando(true);
    const { data } = await supabase
      .from("galeria")
      .select("*")
      .order("orden", { ascending: true });
    if (data) setFotos(data);
    setCargando(false);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubirFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSubiendo(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("galeria")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("galeria").getPublicUrl(fileName);

      const nuevoOrden =
        fotos.length > 0 ? Math.max(...fotos.map((f) => f.orden)) + 1 : 1;

      const { error: dbError } = await supabase
        .from("galeria")
        .insert([{ url: publicUrl, orden: nuevoOrden, categoria }]);

      if (dbError) throw dbError;

      setFile(null);
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      fetchFotos();
    } catch (error: any) {
      console.error("Error subiendo foto:", error.message);
      alert("Hubo un error al subir la foto.");
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async (id: string, url: string) => {
    if (!confirm("¿Seguro que querés eliminar esta imagen?")) return;

    try {
      const fileName = url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("galeria").remove([fileName]);
      }
      const { error } = await supabase
        .from("galeria")
        .delete()
        .eq("id", id);
      if (!error) {
        setFotos(fotos.filter((f) => f.id !== id));
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const fotosFiltradas =
    filtroActivo === "Todas"
      ? fotos
      : fotos.filter((f) => f.categoria === filtroActivo);

  const contarPorCategoria = (cat: string) =>
    fotos.filter((f) => f.categoria === cat).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Galería</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            {fotos.length} fotos publicadas en total
          </p>
        </div>
      </div>

      {/* ÁREA DE CARGA */}
      <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-8 mb-8 shadow-sm">
        <form onSubmit={handleSubirFoto} className="max-w-lg mx-auto">
          {/* Dropzone */}
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
              file
                ? "border-[#C97A96] bg-[#FDF0F4]"
                : "border-[#E8A0B4]/30 bg-[#F7F7F9] hover:bg-[#FDF0F4]"
            }`}
          >
            <span className="text-3xl mb-2">{file ? "📄" : "📤"}</span>
            <p className="text-sm text-[#4A4A55] font-semibold">
              {file ? file.name : "Hacé clic para subir una foto"}
            </p>
            <p className="text-xs text-[#8A8A99] mt-1">
              PNG, JPG o JPEG (Máx. 5MB)
            </p>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>

          {/* Selector de categoría */}
          <div className="mt-5">
            <p className="text-[0.75rem] font-bold text-[#8A8A99] uppercase tracking-wide mb-2">
              Categoría
            </p>
            <div className="flex gap-2">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoria(cat)}
                  className={`flex-1 py-2.5 rounded-full text-[0.82rem] font-semibold transition-all border-[1.5px] ${
                    categoria === cat
                      ? "bg-[#C97A96] text-white border-[#C97A96]"
                      : "bg-transparent text-[#4A4A55] border-[#E8A0B4]/30 hover:border-[#C97A96]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Botón subir */}
          <button
            type="submit"
            disabled={subiendo || !file}
            className="mt-5 w-full bg-[#C97A96] text-white px-8 py-3 rounded-full text-[0.85rem] font-semibold hover:bg-[#1A1A22] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C97A96]/20"
          >
            {subiendo ? "Subiendo..." : `Publicar en ${categoria}`}
          </button>
        </form>
      </div>

      {/* FILTROS + CONTADORES */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFiltroActivo("Todas")}
          className={`px-4 py-1.5 rounded-full border-[1.5px] text-[0.82rem] font-semibold transition-all ${
            filtroActivo === "Todas"
              ? "bg-[#1A1A22] text-white border-[#1A1A22]"
              : "bg-white text-[#4A4A55] border-[#E8A0B4]/30 hover:border-[#C97A96]"
          }`}
        >
          Todas ({fotos.length})
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltroActivo(cat)}
            className={`px-4 py-1.5 rounded-full border-[1.5px] text-[0.82rem] font-semibold transition-all ${
              filtroActivo === cat
                ? "bg-[#C97A96] text-white border-[#C97A96]"
                : "bg-white text-[#4A4A55] border-[#E8A0B4]/30 hover:border-[#C97A96]"
            }`}
          >
            {cat} ({contarPorCategoria(cat)})
          </button>
        ))}
      </div>

      {/* GRILLA DE IMÁGENES */}
      {cargando ? (
        <div className="text-center py-20 text-[#8A8A99]">
          Cargando fotos...
        </div>
      ) : fotosFiltradas.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-[#E8A0B4]/20 rounded-3xl">
          <p className="text-[#8A8A99] text-sm">
            {filtroActivo === "Todas"
              ? "No hay fotos. ¡Subí la primera!"
              : `No hay fotos en "${filtroActivo}" todavía.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {fotosFiltradas.map((foto) => (
            <div
              key={foto.id}
              className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-[#E8A0B4]/10 shadow-sm"
            >
              <img
                src={foto.url}
                alt="Galería Admin"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Badge de categoría */}
              <div className="absolute top-2 left-2">
                <span className="bg-white/90 backdrop-blur-sm text-[#C97A96] text-[0.6rem] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full shadow-sm">
                  {foto.categoria || "Academia"}
                </span>
              </div>

              {/* Overlay con botón eliminar */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleEliminar(foto.id, foto.url)}
                  className="bg-white text-red-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}