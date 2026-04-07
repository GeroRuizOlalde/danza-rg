"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  listarUsuariosSistemaAction,
  invitarUsuarioSistemaAction,
  cambiarRolUsuarioAction,
  eliminarUsuarioSistemaAction,
  getPermisosSecretariaAction,
  actualizarPermisosSecretariaAction,
} from "./actions";
import { SECCIONES_PANEL } from "@/lib/permisos";

type UsuarioSistema = {
  id: string;
  email: string;
  role: "admin" | "secretaria";
  displayName: string;
  createdAt: string;
};

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
};

const ROL_COLOR: Record<string, string> = {
  admin: "bg-[#E8A0B4]/20 text-[#C97A96] border-[#E8A0B4]/30",
  secretaria: "bg-blue-50 text-blue-500 border-blue-100",
};

export default function EquipoPage() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal invitar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invForm, setInvForm] = useState({ email: "", role: "secretaria", displayName: "" });
  const [enviando, setEnviando] = useState(false);

  // Cambio de rol inline
  const [cambiandoRol, setCambiandoRol] = useState<string | null>(null);

  // Confirmar eliminación
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // Permisos secretaria
  const [permisos, setPermisos] = useState<string[]>([]);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  useEffect(() => {
    void cargarUsuarios();
    void cargarPermisos();
  }, []);

  async function cargarPermisos() {
    const result = await getPermisosSecretariaAction();
    if (result.success) setPermisos(result.data);
  }

  const togglePermiso = (key: string) => {
    setPermisos((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleGuardarPermisos = async () => {
    setGuardandoPermisos(true);
    const result = await actualizarPermisosSecretariaAction(permisos);
    if (result.success) {
      toast.success("Permisos guardados.");
    } else {
      toast.error(result.error);
    }
    setGuardandoPermisos(false);
  };

  async function cargarUsuarios() {
    setCargando(true);
    const result = await listarUsuariosSistemaAction();
    if (result.success && result.data) {
      setUsuarios(result.data);
    } else if (!result.success) {
      toast.error(result.error);
    }
    setCargando(false);
  }

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const result = await invitarUsuarioSistemaAction(
      invForm.email,
      invForm.role,
      invForm.displayName
    );
    if (result.success) {
      toast.success("Invitación enviada. El usuario recibirá un email para activar su cuenta.");
      setIsModalOpen(false);
      setInvForm({ email: "", role: "secretaria", displayName: "" });
      await cargarUsuarios();
    } else {
      toast.error(result.error);
    }
    setEnviando(false);
  };

  const handleCambiarRol = async (userId: string, nuevoRol: string) => {
    setCambiandoRol(userId);
    const result = await cambiarRolUsuarioAction(userId, nuevoRol);
    if (result.success) {
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nuevoRol as "admin" | "secretaria" } : u))
      );
      toast.success("Rol actualizado.");
    } else {
      toast.error(result.error);
    }
    setCambiandoRol(null);
  };

  const handleEliminar = async (userId: string) => {
    const result = await eliminarUsuarioSistemaAction(userId);
    if (result.success) {
      setUsuarios((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Usuario eliminado.");
    } else {
      toast.error(result.error);
    }
    setEliminandoId(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-[#1A1A22]">Equipo</h1>
          <p className="text-[#8A8A99] text-sm mt-1">
            Gestioná los usuarios con acceso al panel de administración.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-[#C97A96] text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-[#1A1A22] transition-colors"
        >
          + Invitar usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-10 text-center text-[#8A8A99] text-sm">Cargando...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-10 text-center text-[#8A8A99] text-sm">
            No hay usuarios del sistema registrados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99]">
                  Usuario
                </th>
                <th className="text-left px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99]">
                  Rol
                </th>
                <th className="text-right px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C97A96] to-[#E8A0B4] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(u.displayName || u.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A22]">{u.displayName || "—"}</p>
                        <p className="text-[#8A8A99] text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      disabled={cambiandoRol === u.id}
                      onChange={(e) => handleCambiarRol(u.id, e.target.value)}
                      className={`border rounded-lg px-3 py-1.5 text-xs font-semibold outline-none transition-all cursor-pointer ${ROL_COLOR[u.role]}`}
                    >
                      <option value="admin">Administrador</option>
                      <option value="secretaria">Secretaria</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {eliminandoId === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-[#8A8A99]">¿Confirmar?</span>
                        <button
                          type="button"
                          onClick={() => handleEliminar(u.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEliminandoId(null)}
                          className="text-xs text-[#8A8A99] hover:text-[#1A1A22]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEliminandoId(u.id)}
                        className="text-xs text-[#8A8A99] hover:text-red-400 transition-colors font-medium"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-xs text-amber-700 leading-relaxed">
        <strong>Roles:</strong> <em>Administrador</em> tiene acceso completo al panel.{" "}
        <em>Secretaria</em> solo accede a las secciones que habilites abajo.
      </div>

      {/* Permisos secretaria */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="font-playfair text-xl font-semibold text-negro">Permisos de Secretaria</h2>
          <p className="text-gris-l text-sm mt-0.5">
            Activá o desactivá el acceso a cada sección para el rol secretaria.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {SECCIONES_PANEL.map((seccion) => {
            const activo = !seccion.soloAdmin && permisos.includes(seccion.key);
            const bloqueado = seccion.soloAdmin;
            return (
              <div key={seccion.key} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className={`text-sm font-medium ${bloqueado ? "text-gray-300" : "text-negro"}`}>
                    {seccion.nombre}
                    {bloqueado && (
                      <span className="ml-2 text-[0.65rem] font-bold uppercase tracking-widest text-gray-300">
                        Solo admin
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gris-l">{seccion.path}</p>
                </div>

                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => !bloqueado && togglePermiso(seccion.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    bloqueado
                      ? "cursor-not-allowed bg-gray-100"
                      : activo
                      ? "bg-rosa-d"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      activo && !bloqueado ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleGuardarPermisos}
            disabled={guardandoPermisos}
            className="bg-rosa-d text-white px-8 py-2.5 rounded-full font-semibold text-sm hover:bg-negro transition-colors disabled:opacity-50"
          >
            {guardandoPermisos ? "Guardando..." : "Guardar permisos"}
          </button>
        </div>
      </div>

      {/* Modal invitar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8A0B4]/20 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-50">
              <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">
                Invitar usuario
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#C97A96] hover:text-[#1A1A22] text-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleInvitar} className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={invForm.displayName}
                  onChange={(e) => setInvForm({ ...invForm, displayName: e.target.value })}
                  placeholder="Ej: María González"
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={invForm.email}
                  onChange={(e) => setInvForm({ ...invForm, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all"
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-1.5">
                  Rol *
                </label>
                <select
                  value={invForm.role}
                  onChange={(e) => setInvForm({ ...invForm, role: e.target.value })}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="secretaria">Secretaria</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="text-[0.7rem] text-[#8A8A99] mt-1.5">
                  El usuario recibirá un email para crear su contraseña y acceder al panel.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-gray-200 text-[#8A8A99] py-3 rounded-full font-semibold text-sm hover:border-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !invForm.email}
                  className="flex-[2] bg-[#C97A96] text-white py-3 rounded-full font-semibold text-sm hover:bg-[#1A1A22] transition-all disabled:opacity-50"
                >
                  {enviando ? "Enviando invitación..." : "Enviar invitación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
