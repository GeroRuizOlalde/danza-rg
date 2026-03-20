"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  // Si estamos en el login, solo renderizamos la página (sin menú)
  if (isLogin) {
    return <main className="font-dm-sans bg-[#F7F7F9] min-h-screen">{children}</main>;
  }

  // Si estamos en dashboard, turnos, clientes... mostramos la estructura completa
  return (
    <div className="flex h-screen bg-[#F7F7F9] font-dm-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}