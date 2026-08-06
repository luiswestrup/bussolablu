"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEmpresa } from "@/context/EmpresaContext";

type ContaReceber = {
  id: string;
  descricao: string;
  valor: string;
  cliente_id?: string | null;
  data_vencimento: string;
  data_recebimento?: string | null;
  status?: string;
};

export default function RecebimentosPage() {
  const supabase = useSupabaseClient();
  const { empresaAtiva } = useEmpresa();
  const [items, setItems] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "", from: "", to: "" });

  useEffect(() => {
    if (!empresaAtiva) return setItems([]);
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtiva, filters]);

  async function fetchItems() {
    setLoading(true);
    let query = supabase
      .from("conta_receber_view")
      .select("*")
      .eq("empresa_id", empresaAtiva!.id)
      .order("data_vencimento", { ascending: true });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.from) query = query.gte("data_vencimento", filters.from);
    if (filters.to) query = query.lte("data_vencimento", filters.to);

    const { data, error } = await query;
    if (error) console.error(error);
    setItems((data as any) || []);
    setLoading(false);
  }

  async function marcarRecebido(id: string) {
    const dataRecebimento = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("conta_receber").update({ data_recebimento: dataRecebimento }).eq("id", id);
    if (error) return console.error(error);
    fetchItems();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Recebimentos</h1>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <select className="border p-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="vencido">Vencido</option>
          <option value="recebido">Recebido</option>
        </select>
        <input type="date" className="border p-2" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" className="border p-2" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <button className="px-3 py-2 border rounded" onClick={() => fetchItems()}>Aplicar</button>
      </div>

      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr className="text-left">
            <th className="p-3">Descrição</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Vencimento</th>
            <th className="p-3">Recebimento</th>
            <th className="p-3">Forma</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Status</th>
            <th className="p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan={8} className="p-4">Carregando...</td></tr> :
            items.map(item => {
              const overdue = item.status === "vencido";
              return (
                <tr key={item.id} className={overdue ? "bg-red-50" : ""}>
                  <td className="p-3">{item.descricao}</td>
                  <td className="p-3">{item.cliente_id ?? "-"}</td>
                  <td className="p-3">{item.data_vencimento}</td>
                  <td className="p-3">{item.data_recebimento ?? "-"}</td>
                  <td className="p-3"></td>
                  <td className="p-3">R$ {Number(item.valor).toFixed(2)}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded ${item.status === "vencido" ? "bg-rose-200 text-rose-800" : item.status === "recebido" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{item.status}</span></td>
                  <td className="p-3">
                    {item.status !== "recebido" && <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => marcarRecebido(item.id)}>Marcar como recebido</button>}
                  </td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
}
