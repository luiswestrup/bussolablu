"use client";

import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ProductModal from '@/components/ProductModal';
import { reprocessMappings } from '@/lib/api/importNfe';

export default function NFeUnmappedItemsModal({ items }: { items: any[] }) {
  const supabase = useSupabaseClient();
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({}); // key: pending id -> produto_id
  const [searchResults, setSearchResults] = useState<Record<string, any[]>>({});
  const [openCreate, setOpenCreate] = useState(false);
  const [creatingFor, setCreatingFor] = useState<{ pendingId: string; notaId: string; empresaId: string; fornecedorId?: string } | null>(null);

  useEffect(() => {
    // flatten items into list of pendings with nota reference
    const list: any[] = [];
    items.forEach(n => {
      (n.items || []).forEach((it: any) => {
        list.push({ filename: n.filename, nota_id: n.nota_id, ...it });
      });
    });
    setLocalItems(list);
  }, [items]);

  async function searchProducts(query: string, key: string) {
    if (!query) return setSearchResults(prev => ({ ...prev, [key]: [] }));
    const { data } = await supabase.from('produto').select('id,nome,sku').ilike('nome', `%${query}%`).limit(10);
    setSearchResults(prev => ({ ...prev, [key]: data || [] }));
  }

  async function createProductInline(pending: any, values: { nome: string; sku?: string }) {
    if (!pending || !pending.empresa_id) return;
    const { data, error } = await supabase.from('produto').insert([{
      empresa_id: pending.empresa_id,
      nome: values.nome,
      sku: values.sku || null,
      custo: pending.valor_unitario || 0,
      preco_venda: pending.valor_unitario || 0,
      quantidade: 0,
      estoque_minimo: 0,
      status: 'ativo'
    }]).select().single();

    if (error) return alert('Erro ao criar produto: ' + error.message);
    // set selection
    setSelectedMap(prev => ({ ...prev, [pending.id]: (data as any).id }));
    setOpenCreate(false);
  }

  async function handleMapAndReprocess() {
    // group mappings by nota_id and fornecedor if available
    const mappingsByNota: Record<string, any[]> = {};
    for (const p of localItems) {
      const chosen = selectedMap[p.id];
      if (chosen) {
        const list = mappingsByNota[p.nota_id] || (mappingsByNota[p.nota_id] = []);
        list.push({ codigo_prod_fornecedor: p.codigo_prod_fornecedor || p.codigo, produto_id: chosen, fornecedor_id: p.fornecedor_id, empresa_id: p.empresa_id || p.empresaId || null });
      }
    }

    // call reprocess per nota
    for (const notaId of Object.keys(mappingsByNota)) {
      const mappings = mappingsByNota[notaId];
      try {
        const resp = await reprocessMappings(mappings[0].empresa_id, notaId, mappings);
        // simple success handling: remove resolved items from localItems
        // better: use resp.totalItemsResolved to filter
        alert(`Reprocess result: ${JSON.stringify(resp)}`);
        // reload: remove items matching notaId that were mapped
        setLocalItems(prev => prev.filter(p => p.nota_id !== notaId || !selectedMap[p.id]));
      } catch (e: any) {
        alert('Erro no reprocessamento: ' + e.message);
      }
    }
  }

  if (!localItems || localItems.length === 0) return null;

  return (
    <div className="mt-6 bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Itens não reconhecidos</h3>
      <div className="space-y-3">
        {localItems.map((it, idx) => (
          <div key={it.id ?? idx} className="p-3 border rounded bg-amber-50">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div><strong>Arquivo:</strong> {it.filename}</div>
                <div><strong>Nota:</strong> {it.nota_id}</div>
                <div><strong>Código fornecedor:</strong> {it.codigo_prod_fornecedor ?? it.codigo}</div>
                <div><strong>Descrição:</strong> {it.descricao}</div>
                <div><strong>Quantidade:</strong> {it.quantidade}</div>
                <div><strong>Valor unitário:</strong> R$ {Number(it.valor_unitario).toFixed(2)}</div>
              </div>
              <div className="w-64">
                <input placeholder="Buscar produto por nome" className="w-full border p-2 mb-2" onChange={(e) => searchProducts(e.target.value, String(it.id ?? idx))} />
                <div className="max-h-40 overflow-auto border rounded">
                  {(searchResults[String(it.id ?? idx)] || []).map((p: any) => (
                    <div key={p.id} className={`p-2 cursor-pointer ${selectedMap[it.id] === p.id ? 'bg-sky-100' : ''}`} onClick={() => setSelectedMap(prev => ({ ...prev, [it.id]: p.id }))}>
                      {p.nome} {p.sku ? `(${p.sku})` : ''}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1 border" onClick={() => { setCreatingFor({ pendingId: it.id, notaId: it.nota_id, empresaId: it.empresa_id || it.empresaId, fornecedorId: it.fornecedor_id }); setOpenCreate(true); }}>Criar produto</button>
                  <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={() => setSelectedMap(prev => ({ ...prev, [it.id]: selectedMap[it.id] }))}>Selecionar</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleMapAndReprocess}>Confirmar mapeamentos e reprocessar</button>
      </div>

      {openCreate && creatingFor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-4 rounded w-[480px]">
            <h4 className="font-semibold mb-2">Criar produto</h4>
            <CreateProductForm pending={{...creatingFor}} onCreate={(values) => createProductInline({ id: creatingFor.pendingId, empresa_id: creatingFor.empresaId, fornecedor_id: creatingFor.fornecedorId, valor_unitario: 0 }, values)} onCancel={() => setOpenCreate(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function CreateProductForm({ pending, onCreate, onCancel }: any) {
  const [form, setForm] = React.useState({ nome: '', sku: '', custo: '', preco_venda: '', quantidade: '0', estoque_minimo: '0' });

  return (
    <div>
      <input className="w-full border p-2 mb-2" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      <input className="w-full border p-2 mb-2" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
      <input className="w-full border p-2 mb-2" placeholder="Custo" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
      <input className="w-full border p-2 mb-2" placeholder="Preço venda" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
      <div className="flex justify-end gap-2">
        <button className="px-3 py-1 border" onClick={onCancel}>Cancelar</button>
        <button className="px-3 py-1 bg-sky-700 text-white" onClick={() => onCreate({ nome: form.nome, sku: form.sku, custo: Number(form.custo || 0), preco_venda: Number(form.preco_venda || 0) })}>Criar</button>
      </div>
    </div>
  );
}
