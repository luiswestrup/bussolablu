"use client";

import React, { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEmpresa } from "@/context/EmpresaContext";

const ProductModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const supabase = useSupabaseClient();
  const { empresaAtiva } = useEmpresa();
  const [form, setForm] = useState({ nome: "", sku: "", categoria_id: "", custo: "", preco_venda: "", quantidade: "0", estoque_minimo: "0", status: "ativo" });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!empresaAtiva) return alert("Selecione a empresa");
    if (!form.nome || !form.custo || !form.preco_venda) return alert("Preencha campos obrigatórios");
    setLoading(true);
    const { error } = await supabase.from("produto").insert([{
      empresa_id: empresaAtiva.id,
      nome: form.nome,
      sku: form.sku || null,
      categoria_id: form.categoria_id || null,
      custo: Number(form.custo),
      preco_venda: Number(form.preco_venda),
      quantidade: Number(form.quantidade),
      estoque_minimo: Number(form.estoque_minimo),
      status: form.status
    }]);
    setLoading(false);
    if (error) return alert("Erro: " + error.message);
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-[640px]">
        <h2 className="text-lg font-semibold mb-4">Novo produto</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full border p-2 col-span-2" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input className="w-full border p-2" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className="w-full border p-2" placeholder="Categoria ID" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} />
          <input className="w-full border p-2" placeholder="Custo" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
          <input className="w-full border p-2" placeholder="Preço de venda" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
          <input className="w-full border p-2" placeholder="Quantidade inicial" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
          <input className="w-full border p-2" placeholder="Estoque mínimo" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-4 py-2 border rounded" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="px-4 py-2 bg-sky-700 text-white rounded" onClick={submit} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
