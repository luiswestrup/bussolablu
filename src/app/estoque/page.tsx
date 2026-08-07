"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEmpresa } from "@/context/EmpresaContext";
import ProductModal from "@/components/ProductModal";
import StockMovementModal from "@/components/StockMovementModal";

type Produto = {
  id: string;
  nome: string;
  sku?: string | null;
  categoria_id?: string | null;
  custo: string;
  preco_venda: string;
  quantidade: string;
  estoque_minimo: string;
  status: string;
  estoque_baixo?: boolean;
  categoria_nome?: string | null;
};

export default function EstoquePage() {
  const supabase = useSupabaseClient();
  const { empresaAtiva } = useEmpresa();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [openProductModal, setOpenProductModal] = useState(false);
  const [openMovementModal, setOpenMovementModal] = useState(false);

  useEffect(() => {
    if (!empresaAtiva) return setProdutos([]);
    fetchProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtiva]);

  async function fetchProdutos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("produto_view")
      .select("*")
      .eq("empresa_id", empresaAtiva!.id)
      .order("nome", { ascending: true });

    if (error) console.error(error);
    setProdutos((data as any) || []);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Estoque</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-sky-700 text-white rounded" onClick={() => setOpenMovementModal(true)}>Registrar movimentação</button>
          <button className="px-4 py-2 bg-slate-700 text-white rounded" onClick={() => setOpenProductModal(true)}>Novo produto</button>
        </div>
      </div>

      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr className="text-left">
            <th className="p-3">Nome</th>
            <th className="p-3">SKU</th>
            <th className="p-3">Categoria</th>
            <th className="p-3">Custo</th>
            <th className="p-3">Preço venda</th>
            <th className="p-3">Quantidade</th>
            <th className="p-3">Estoque mínimo</th>
            <th className="p-3">Situação</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan={8} className="p-4">Carregando...</td></tr> :
            produtos.map(p => (
              <tr key={p.id} className={p.estoque_baixo ? "bg-amber-50" : ""}>
                <td className="p-3">{p.nome}</td>
                <td className="p-3">{p.sku ?? "-"}</td>
                <td className="p-3">{p.categoria_nome ?? "-"}</td>
                <td className="p-3">R$ {Number(p.custo).toFixed(2)}</td>
                <td className="p-3">R$ {Number(p.preco_venda).toFixed(2)}</td>
                <td className="p-3">{Number(p.quantidade).toFixed(2)}</td>
                <td className="p-3">{Number(p.estoque_minimo).toFixed(2)}</td>
                <td className="p-3">{p.estoque_baixo ? <span className="px-2 py-1 rounded bg-amber-200 text-amber-800">Estoque baixo</span> : <span className="px-2 py-1 rounded bg-gray-100">{p.status}</span>}</td>
              </tr>
            ))
          }
        </tbody>
      </table>

      <ProductModal open={openProductModal} onClose={() => { setOpenProductModal(false); fetchProdutos(); }} />
      <StockMovementModal open={openMovementModal} onClose={() => { setOpenMovementModal(false); fetchProdutos(); }} />
    </div>
  );
}
