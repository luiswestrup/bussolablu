"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEmpresa } from "@/context/EmpresaContext";
import ReportTable from "@/components/ReportTable";
import { exportCSV, exportPDF } from "@/lib/export";

type Range = { from: string; to: string };

export default function RelatoriosPage() {
  const supabase = useSupabaseClient();
  const { empresaAtiva } = useEmpresa();
  const [range, setRange] = useState<Range>({ from: new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) });

  const [fluxo, setFluxo] = useState<any[]>([]);
  const [contas, setContas] = useState({ pagar: [] as any[], receber: [] as any[] });
  const [lucroMensal, setLucroMensal] = useState<any[]>([]);
  const [produtosEstoque, setProdutosEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaAtiva) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtiva, range]);

  async function fetchAll() {
    setLoading(true);
    const { from, to } = range;

    // Contas a pagar e receber (usando views com status calculado)
    const [{ data: pagar }, { data: receber }] = await Promise.all([
      supabase.from('conta_pagar_view').select('*').eq('empresa_id', empresaAtiva!.id).gte('data_vencimento', from).lte('data_vencimento', to).order('data_vencimento'),
      supabase.from('conta_receber_view').select('*').eq('empresa_id', empresaAtiva!.id).gte('data_vencimento', from).lte('data_vencimento', to).order('data_vencimento')
    ] as any);

    setContas({ pagar: pagar || [], receber: receber || [] });

    // Fluxo de caixa por mês (agregação no client)
    // Para fluxo consideramos: entradas = total recebido (status 'recebido') com data_recebimento dentro do range
    // e saidas = total pago (status 'pago') com data_pagamento dentro do range
    const { data: pagosAll } = await supabase.from('conta_pagar_view').select('valor,data_pagamento,status').eq('empresa_id', empresaAtiva!.id).gte('data_pagamento', from).lte('data_pagamento', to);
    const { data: recebidosAll } = await supabase.from('conta_receber_view').select('valor,data_recebimento,status').eq('empresa_id', empresaAtiva!.id).gte('data_recebimento', from).lte('data_recebimento', to);

    const monthsMap: Record<string, { entradas: number; saidas: number }> = {};

    function monthKey(dateStr: string | null) {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    (recebidosAll || []).forEach((r: any) => {
      if (r.status !== 'recebido') return;
      const m = monthKey(r.data_recebimento);
      if (!m) return;
      monthsMap[m] = monthsMap[m] || { entradas: 0, saidas: 0 };
      monthsMap[m].entradas += Number(r.valor || 0);
    });

    (pagosAll || []).forEach((p: any) => {
      if (p.status !== 'pago') return;
      const m = monthKey(p.data_pagamento);
      if (!m) return;
      monthsMap[m] = monthsMap[m] || { entradas: 0, saidas: 0 };
      monthsMap[m].saidas += Number(p.valor || 0);
    });

    const fluxoArr = Object.keys(monthsMap).sort().map(m => ({ mes: m, entradas: monthsMap[m].entradas, saidas: monthsMap[m].saidas, saldo: monthsMap[m].entradas - monthsMap[m].saidas }));
    setFluxo(fluxoArr);

    // Lucro mensal (simplificado) = entradas - saidas por mes -> reusar fluxoArr
    const lucro = fluxoArr.map(f => ({ mes: f.mes, lucro: f.saldo }));
    setLucroMensal(lucro);

    // Estoque atual
    const { data: produtos } = await supabase.from('produto_view').select('*').eq('empresa_id', empresaAtiva!.id).order('nome');
    setProdutosEstoque(produtos || []);

    setLoading(false);
  }

  function handleExportCSVFluxo() {
    const rows = fluxo.map(r => ({ Mês: r.mes, Entradas: r.entradas.toFixed(2), Saídas: r.saidas.toFixed(2), Saldo: r.saldo.toFixed(2) }));
    exportCSV(rows, `fluxo_caixa_${range.from}_${range.to}.csv`);
  }

  function handleExportCSVContas() {
    // exportar dois CSVs separados em zip não implementado; vamos juntar em um único CSV com seção
    const pagarRows = contas.pagar.map((p: any) => ({ tipo: 'pagar', descricao: p.descricao, valor: Number(p.valor).toFixed(2), data_vencimento: p.data_vencimento, status: p.status }));
    const receberRows = contas.receber.map((r: any) => ({ tipo: 'receber', descricao: r.descricao, valor: Number(r.valor).toFixed(2), data_vencimento: r.data_vencimento, status: r.status }));
    exportCSV([...pagarRows, ...receberRows], `contas_${range.from}_${range.to}.csv`);
  }

  function handleExportCSVLucro() {
    const rows = lucroMensal.map(r => ({ mes: r.mes, lucro: r.lucro.toFixed(2) }));
    exportCSV(rows, `lucro_mensal_${range.from}_${range.to}.csv`);
  }

  function handleExportCSVEstoque() {
    const rows = produtosEstoque.map(p => ({ nome: p.nome, sku: p.sku || '', categoria: p.categoria_nome || '', custo: Number(p.custo).toFixed(2), preco_venda: Number(p.preco_venda).toFixed(2), quantidade: Number(p.quantidade).toFixed(2), estoque_minimo: Number(p.estoque_minimo).toFixed(2), estoque_baixo: p.estoque_baixo ? 'SIM' : 'NAO' }));
    exportCSV(rows, `estoque_${range.from}_${range.to}.csv`);
  }

  function handleExportPDFBlock(title: string, htmlFragment: string) {
    exportPDF(`<h1>${title}</h1>${htmlFragment}`, `${title}.pdf`);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Relatórios</h1>

      <div className="mb-4 flex gap-2 items-center">
        <label>Período:</label>
        <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="border p-2" />
        <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="border p-2" />
        <button className="px-3 py-2 bg-sky-700 text-white rounded" onClick={fetchAll}>Aplicar</button>
      </div>

      {/* 1. Fluxo de caixa */}
      <section className="mb-6 bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Fluxo de caixa por período</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border" onClick={handleExportCSVFluxo}>Exportar CSV</button>
            <button className="px-3 py-1 border" onClick={() => handleExportPDFBlock('Fluxo de caixa', `<table>${fluxo.map(f=>`<tr><td>${f.mes}</td><td>${f.entradas.toFixed(2)}</td><td>${f.saidas.toFixed(2)}</td><td>${f.saldo.toFixed(2)}</td></tr>`).join('')}</table>`,)}>Exportar PDF</button>
          </div>
        </div>

        <div>
          {/* tabela simplificada */}
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="p-2 text-left">Mês</th>
                <th className="p-2 text-right">Entradas</th>
                <th className="p-2 text-right">Saídas</th>
                <th className="p-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {fluxo.map(f => (
                <tr key={f.mes}>
                  <td className="p-2">{f.mes}</td>
                  <td className="p-2 text-right">R$ {f.entradas.toFixed(2)}</td>
                  <td className="p-2 text-right">R$ {f.saidas.toFixed(2)}</td>
                  <td className="p-2 text-right">R$ {f.saldo.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-sm text-gray-500">Gráfico de linha: (em breve) - use os dados acima para montar o gráfico</div>
        </div>
      </section>

      {/* 2. Contas a pagar e a receber */}
      <section className="mb-6 bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Contas a pagar e a receber</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border" onClick={handleExportCSVContas}>Exportar CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Contas a pagar</h3>
            <ReportTable data={contas.pagar} columns={["descricao","valor","data_vencimento","status"]} />
          </div>
          <div>
            <h3 className="font-medium mb-2">Contas a receber</h3>
            <ReportTable data={contas.receber} columns={["descricao","valor","data_vencimento","status"]} />
          </div>
        </div>
      </section>

      {/* 3. Lucratividade simplificada */}
      <section className="mb-6 bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Lucratividade simplificada</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border" onClick={handleExportCSVLucro}>Exportar CSV</button>
          </div>
        </div>

        <div>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="p-2 text-left">Mês</th>
                <th className="p-2 text-right">Lucro (R$)</th>
              </tr>
            </thead>
            <tbody>
              {lucroMensal.map(l => (
                <tr key={l.mes}>
                  <td className="p-2">{l.mes}</td>
                  <td className={`p-2 text-right ${l.lucro >= 0 ? 'text-green-600' : 'text-rose-600'}`}>R$ {l.lucro.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Estoque atual e baixo estoque */}
      <section className="mb-6 bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Estoque atual e baixo estoque</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border" onClick={handleExportCSVEstoque}>Exportar CSV</button>
            <button className="px-3 py-1 border" onClick={() => handleExportPDFBlock('Estoque atual', `<table>${produtosEstoque.map((p:any)=>`<tr><td>${p.nome}</td><td>${p.sku||''}</td><td>${Number(p.quantidade).toFixed(2)}</td><td>${p.estoque_baixo? 'SIM':'NAO'}</td></tr>`).join('')}</table>`,)}>Exportar PDF</button>
          </div>
        </div>

        <div>
          <ReportTable data={produtosEstoque} columns={["nome","sku","categoria_nome","custo","preco_venda","quantidade","estoque_minimo","estoque_baixo"]} />
        </div>
      </section>

    </div>
  );
}
