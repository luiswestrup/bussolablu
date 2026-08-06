"use client";

import React, { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEmpresa } from "@/context/EmpresaContext";

const PaymentModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const supabase = useSupabaseClient();
  const { empresaAtiva } = useEmpresa();
  const [form, setForm] = useState({ descricao: "", valor: "", data_vencimento: "", categoria_id: "", fornecedor_id: "", forma_pagamento: "" });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!empresaAtiva) return alert("Selecione a empresa");
    if (!form.descricao || !form.valor || !form.data_vencimento) return alert("Preencha campos obrigatórios");
    setLoading(true);
    const { error } = await supabase.from("conta_pagar").insert([{
      empresa_id: empresaAtiva.id,
      descricao: form.descricao,
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento,
      categoria_id: form.categoria_id || null,
      fornecedor_id: form.fornecedor_id || null,
      forma_pagamento: form.forma_pagamento || null
    }]);
    setLoading(false);
    if (error) return alert("Erro: " + error.message);
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-[600px]">
        <h2 className="text-lg font-semibold mb-4">Novo pagamento</h2>
        <div className="space-y-2">
          <input className="w-full border p-2" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <input className="w-full border p-2" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <input type="date" className="w-full border p-2" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-4 py-2 border rounded" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="px-4 py-2 bg-sky-700 text-white rounded" onClick={submit} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
