"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEmpresa } from "@/context/EmpresaContext";

export default function DashboardPage() {
  const supabase = useSupabaseClient();
  const { empresaAtiva } = useEmpresa();
  const [saldo, setSaldo] = useState<number | null>(null);
  const [aPagarVencido, setAPagarVencido] = useState(0);
  const [aPagarAVencer, setAPagarAVencer] = useState(0);
  const [aReceberVencido, setAReceberVencido] = useState(0);
  const [aReceberAVencer, setAReceberAVencer] = useState(0);
  const [temVencidos, setTemVencidos] = useState(false);
  const [valorEstoque, setValorEstoque] = useState(0);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState(0);

  useEffect(() => {
    if (!empresaAtiva) return;
    fetchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtiva]);

  async function fetchSummaries() {
    const { data: pagosData } = await supabase
      .from("conta_pagar_view")
      .select("valor,status")
      .eq("empresa_id", empresaAtiva!.id);

    const { data: recebersData } = await supabase
      .from("conta_receber_view")
      .select("valor,status")
      .eq("empresa_id", empresaAtiva!.id);

    const totalPago = (pagosData || []).reduce((s: number, r: any) => s + Number(r.status === "pago" ? r.valor : 0), 0);
    const totalRecebido = (recebersData || []).reduce((s: number, r: any) => s + Number(r.status === "recebido" ? r.valor : 0), 0);
    setSaldo(totalRecebido - totalPago);

    const vencidoPago = (pagosData || []).filter((r:any)=> r.status === "vencido").reduce((s:number,r:any)=> s + Number(r.valor), 0);
    const avencerPago = (pagosData || []).filter((r:any)=> r.status !== "vencido").reduce((s:number,r:any)=> s + Number(r.valor), 0);
    setAPagarVencido(vencidoPago);
    setAPagarAVencer(avencerPago);

    const vencidoReceber = (recebersData || []).filter((r:any)=> r.status === "vencido").reduce((s:number,r:any)=> s + Number(r.valor), 0);
    const avencerReceber = (recebersData || []).filter((r:any)=> r.status !== "vencido").reduce((s:number,r:any)=> s + Number(r.valor), 0);
    setAReceberVencido(vencidoReceber);
    setAReceberAVencer(avencerReceber);

    setTemVencidos((vencidoPago + vencidoReceber) > 0);

    // valor total em estoque (soma custo * quantidade de produtos ativos)
    const { data: produtos } = await supabase.from('produto').select('custo,quantidade').eq('empresa_id', empresaAtiva!.id).eq('status','ativo');
    const valor = (produtos || []).reduce((s:any, p:any) => s + Number(p.custo) * Number(p.quantidade), 0);
    setValorEstoque(valor);

    // produtos com estoque baixo
    const { data: baixos } = await supabase.from('produto_view').select('id').eq('empresa_id', empresaAtiva!.id).eq('estoque_baixo', true);
    setProdutosEstoqueBaixo((baixos || []).length);
  }

  return (
    <div>
      {(temVencidos || produtosEstoqueBaixo > 0) && (
        <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-800 p-3 mb-4">
          {temVencidos && <div>Existem contas vencidas: total vencido R$ {(aPagarVencido + aReceberVencido).toFixed(2)}</div>}
          {produtosEstoqueBaixo > 0 && <div className="mt-2">Produtos com estoque baixo: {produtosEstoqueBaixo}</div>}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded shadow">
          <h3 className="text-sm text-gray-500">Saldo de caixa</h3>
          <div className="text-2xl font-bold">R$ {saldo?.toFixed(2) ?? "0.00"}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h3 className="text-sm text-gray-500">A pagar</h3>
          <div>Vencido: R$ {aPagarVencido.toFixed(2)}</div>
          <div>A vencer: R$ {aPagarAVencer.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h3 className="text-sm text-gray-500">A receber</h3>
          <div>Vencido: R$ {aReceberVencido.toFixed(2)}</div>
          <div>A vencer: R$ {aReceberAVencer.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h3 className="text-sm text-gray-500">Valor total em estoque</h3>
          <div className="text-2xl font-bold">R$ {valorEstoque.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded shadow">Gráfico de linha (evolução do saldo) - implementar</div>
        <div className="p-4 bg-white rounded shadow">Gráfico de barras Entradas x Saídas - implementar</div>
      </div>
    </div>
  );
}
