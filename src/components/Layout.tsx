"use client";

import React, { useState } from "react";
import { useEmpresa } from "@/context/EmpresaContext";
import { useEmpresaPapel } from "@/hooks/useEmpresaPapel";
import Link from "next/link";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { empresaAtiva, empresas, setEmpresaAtiva } = useEmpresa();
  const papel = useEmpresaPapel();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between bg-white p-2 border-b">
        <button onClick={() => setOpen(!open)} className="p-2">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="font-bold">FlowMaster</div>
        <div></div>
      </div>

      {/* Sidebar */}
      <aside className={`bg-[#0b2035] text-white p-4 md:w-64 ${open ? 'block' : 'hidden'} md:block`}>
        <div className="mb-6 font-bold text-xl">FlowMaster</div>
        <nav className="space-y-2">
          <Link className="block py-2 px-3 rounded hover:bg-[#0f2a41]" href="/app/dashboard">Dashboard</Link>
          {papel !== 'estoque' && (
            <>
              <Link className="block py-2 px-3 rounded hover:bg-[#0f2a41]" href="/app/pagamentos">Pagamentos</Link>
              <Link className="block py-2 px-3 rounded hover:bg-[#0f2a41]" href="/app/recebimentos">Recebimentos</Link>
              <Link className="block py-2 px-3 rounded hover:bg-[#0f2a41]" href="/app/relatorios">Relatórios</Link>
            </>
          )}
          <Link className="block py-2 px-3 rounded hover:bg-[#0f2a41]" href="/app/estoque">Estoque</Link>
          <Link className="block py-2 px-3 rounded hover:bg-[#0f2a41]" href="/app/configuracoes">Configurações</Link>
        </nav>
      </aside>

      <div className="flex-1 bg-gray-100 min-h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-white">
          <div>
            <select
              value={empresaAtiva?.id ?? ""}
              onChange={(e) => {
                const sel = empresas.find((x) => x.id === e.target.value) ?? null;
                setEmpresaAtiva(sel);
              }}
              className="border rounded p-2"
            >
              <option value="">Selecione a empresa</option>
              {empresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
            </select>
          </div>
          <div>
            {/* espaço para user menu */}
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
