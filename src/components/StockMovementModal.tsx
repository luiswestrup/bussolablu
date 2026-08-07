"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEmpresa } from "@/context/EmpresaContext";

const StockMovementModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const supabase = useSupabaseClient();
  const { empresaAtiva } = useEmpresa();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [form, setForm] = useState({ produto_id: "", tipo: "entrada", quantidade: "", motivo: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !empresaAtiva) return;
    (async () => {
      const { data } = await supabase.from('produto_view').select('id,nome,quantidade').eq('empresa_id', empresaAtiva.id).order('nome');
      setProdutos((data as any) || []);
    })();
  }, [open, empresaAtiva, supabase]);

  if (!open) return null;

  async function submit() {
    if (!empresaAtiva) return alert('Selecione a empresa');
    if (!form.produto_id || !form.quantidade) return alert('Preencha os campos');
    setLoading(true);
    const { error } = await supabase.from('movimento_estoque').insert([{
      produto_id: form.produto_id,
      tipo: form.tipo,
      quantidade: Number(form.quantidade),
      motivo: form.motivo || null
    }]);
    setLoading(false);
    if (error) return alert('Erro: ' + error.message);
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-[640px]">
        <h2 className="text-lg font-semibold mb-4">Registrar movimentação</h2>
        <div className="space-y-2">
          <select className="w-full border p-2" value={form.produto_id} onChange={(e) => setForm({ ...form, produto_id: e.target.value })}>
            <option value="">Selecione o produto</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (em estoque: {Number(p.quantidade).toFixed(2)})</option>)}
          </select>
          <select className="w-full border p-2" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <input className="w-full border p-2" placeholder="Quantidade" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
          <input className="w-full border p-2" placeholder="Motivo" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-4 py-2 border rounded" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="px-4 py-2 bg-sky-700 text-white rounded" onClick={submit} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
};

export default StockMovementModal;
