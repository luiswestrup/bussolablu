import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  ArrowDownCircle,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Cloud,
  Compass,
  CreditCard,
  FileText,
  Home,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import iconeAsset from "@/assets/bussola-blu-icone.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fluxo Gestão — Financeiro e Estoque para PMEs" },
      {
        name: "description",
        content:
          "Controle pagamentos, recebimentos, estoque e fluxo de caixa em um único painel, com gráficos e relatórios em tempo real.",
      },
      { property: "og:title", content: "Fluxo Gestão — Financeiro e Estoque para PMEs" },
      {
        property: "og:description",
        content:
          "Contas a pagar, contas a receber, estoque e indicadores financeiros em um painel multi-empresa.",
      },
    ],
  }),
  component: Index,
});

const destaques = [
  {
    icone: Wallet,
    titulo: "Caixa",
    texto: "Movimente, concilie e tenha o saldo sempre atualizado.",
  },
  {
    icone: FileText,
    titulo: "Contas",
    texto: "Pague e receba com organização e controle total.",
  },
  {
    icone: Boxes,
    titulo: "Estoque",
    texto: "Monitore níveis, evite faltas e compre com segurança.",
  },
];

const beneficios = [
  { icone: ShieldCheck, titulo: "Mais controle", texto: "em cada operação" },
  { icone: Clock, titulo: "Decisões rápidas", texto: "com dados reais" },
  { icone: Cloud, titulo: "Tudo integrado", texto: "e sempre seguro" },
];

const menuPreview = [
  { icone: Home, label: "Resumo" },
  { icone: Wallet, label: "Caixa" },
  { icone: Receipt, label: "Contas a pagar" },
  { icone: FileText, label: "Contas a receber" },
  { icone: Boxes, label: "Estoque" },
  { icone: Package, label: "Produtos" },
  { icone: BarChart3, label: "Indicadores" },
  { icone: FileText, label: "Relatórios" },
  { icone: Building2, label: "Empresas" },
  { icone: Settings, label: "Configurações" },
];

const kpis = [
  {
    icone: Wallet,
    titulo: "Saldo em caixa",
    valor: "R$ 148.560,00",
    detalhe: "Atualizado hoje, 09:30",
  },
  {
    icone: ArrowDownCircle,
    titulo: "Contas a receber",
    valor: "R$ 236.980,00",
    detalhe: "Próximos 30 dias",
  },
  {
    icone: CreditCard,
    titulo: "Contas a pagar",
    valor: "R$ 82.340,00",
    detalhe: "Próximos 30 dias",
  },
];

const despesas = [
  { nome: "Operacional", pct: 45, cor: "#087E8B" },
  { nome: "Administrativo", pct: 25, cor: "#0B1F3A" },
  { nome: "Comercial", pct: 20, cor: "#5BC0EB" },
  { nome: "Outros", pct: 10, cor: "#D6A84F" },
];

const estoquePreview = [
  { icone: AlertTriangle, label: "Abaixo do mínimo", valor: "7", cor: "#C0392B" },
  { icone: AlertTriangle, label: "Em atenção", valor: "5", cor: "#C98A17" },
  { icone: CheckCircle2, label: "Normal", valor: "128", cor: "#1B8A5A" },
];

function BussolaMarca({ className = "" }: { className?: string }) {
  return (
    <img src={iconeAsset.url} alt="Bussola Blu" className={`object-contain ${className}`} />
  );
}

function LinhaFluxo() {
  const series = [
    { cor: "#087E8B", pontos: "0,58 60,46 120,40 180,30 240,34 300,22 360,18 420,24" },
    { cor: "#0B1F3A", pontos: "0,86 60,80 120,84 180,72 240,78 300,68 360,74 420,66" },
    { cor: "#D6A84F", pontos: "0,116 60,112 120,118 180,108 240,112 300,104 360,110 420,102" },
  ];
  return (
    <svg viewBox="0 0 440 140" className="h-40 w-full" role="img" aria-label="Fluxo de caixa">
      {[0, 34, 68, 102, 136].map((y) => (
        <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="#E4E9EF" strokeWidth="1" />
      ))}
      {series.map((s) => (
        <polyline
          key={s.cor}
          points={s.pontos}
          fill="none"
          stroke={s.cor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function Donut() {
  let acumulado = 0;
  const raio = 42;
  const circ = 2 * Math.PI * raio;
  return (
    <svg viewBox="0 0 110 110" className="h-24 w-24 shrink-0 -rotate-90">
      {despesas.map((d) => {
        const dash = (d.pct / 100) * circ;
        const offset = -(acumulado / 100) * circ;
        acumulado += d.pct;
        return (
          <circle
            key={d.nome}
            cx="55"
            cy="55"
            r={raio}
            fill="none"
            stroke={d.cor}
            strokeWidth="18"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
          />
        );
      })}
    </svg>
  );
}

function PreviewPainel() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-25px_rgba(11,31,58,0.45)] ring-1 ring-navy/10">
      <div className="grid grid-cols-1 sm:grid-cols-[190px_minmax(0,1fr)]">
        <div className="hidden flex-col bg-navy p-3 sm:flex">
          <div className="mb-4 flex items-center gap-2 px-1 pt-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white p-0.5">
              <BussolaMarca className="h-full w-full" />
            </span>
            <span className="font-display text-sm font-bold text-white">Bussola Blu</span>
          </div>
          <nav className="space-y-0.5">
            {menuPreview.map((m, i) => (
              <div
                key={m.label}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                  i === 0 ? "bg-white font-semibold text-navy" : "text-white/70"
                }`}
              >
                <m.icone className="h-3.5 w-3.5" />
                {m.label}
              </div>
            ))}
          </nav>
          <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 p-1 opacity-70">
            <BussolaMarca className="h-full w-full" />
          </span>
        </div>

        <div className="min-w-0 space-y-3 bg-mist p-4">
          <h3 className="font-display text-sm font-bold text-navy">Resumo financeiro</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {kpis.map((k) => (
              <div key={k.titulo} className="rounded-xl bg-white p-3 ring-1 ring-navy/5">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <k.icone className="h-3.5 w-3.5 text-ocean" />
                  {k.titulo}
                </div>
                <p className="mt-1 whitespace-nowrap font-mono text-[13px] font-semibold text-navy">{k.valor}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{k.detalhe}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-3 ring-1 ring-navy/5">
            <p className="font-display text-xs font-bold text-navy">Fluxo de caixa</p>
            <div className="mt-1 flex gap-4 text-[10px] text-slate-500">
              {[
                { l: "Entradas", c: "#087E8B" },
                { l: "Saídas", c: "#0B1F3A" },
                { l: "Saldo", c: "#D6A84F" },
              ].map((s) => (
                <span key={s.l} className="inline-flex items-center gap-1">
                  <span className="h-0.5 w-3 rounded" style={{ background: s.c }} />
                  {s.l}
                </span>
              ))}
            </div>
            <LinhaFluxo />
            <div className="flex justify-between text-[10px] text-slate-400">
              {["01 Mai", "08 Mai", "15 Mai", "22 Mai", "29 Mai"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl bg-white p-3 ring-1 ring-navy/5">
              <p className="font-display text-xs font-bold text-navy">Despesas por categoria</p>
              <div className="mt-2 flex items-center gap-4">
                <Donut />
                <ul className="space-y-1 text-[10px] text-slate-500">
                  {despesas.map((d) => (
                    <li key={d.nome} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: d.cor }}
                      />
                      <span className="min-w-[66px]">{d.nome}</span>
                      <span className="font-mono text-navy">{d.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-navy/5">
              <p className="font-display text-xs font-bold text-navy">Estoque</p>
              <ul className="mt-2 space-y-2 text-[11px] text-slate-600">
                {estoquePreview.map((e) => (
                  <li key={e.label} className="flex items-center gap-2">
                    <e.icone className="h-3.5 w-3.5" style={{ color: e.cor }} />
                    <span className="flex-1">{e.label}</span>
                    <span className="font-mono font-semibold text-navy">{e.valor}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold text-ocean">Ver detalhes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  const [logado, setLogado] = useState(false);

  // Após o login social o provedor devolve o usuário para "/"; leva ao painel.
  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo || !data.session) return;
      setLogado(true);
      navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!sessao) return;
      setLogado(true);
      navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white font-body">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <BussolaMarca className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-2xl font-extrabold leading-none text-navy">
                Bussola <span className="text-ocean">Blu</span>
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-px w-5 bg-gold" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-navy/70">
                  Sistema Financeiro
                </span>
                <span className="h-px w-5 bg-gold" />
              </div>
            </div>
          </div>
          <Link
            to={logado ? "/dashboard" : "/auth"}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-soft"
          >
            {logado ? "Ir para o painel" : "Entrar"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-mist">
          <Compass
            className="pointer-events-none absolute -right-10 top-10 h-[420px] w-[420px] text-navy/[0.05]"
            strokeWidth={0.6}
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ocean">
                Gestão financeira e operacional
              </p>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] text-navy sm:text-5xl">
                Caixa, contas e estoque em um <span className="text-ocean">único painel.</span>
              </h1>
              <p className="mt-5 max-w-md text-base text-slate-500">
                Registre, acompanhe e tome decisões com mais controle e eficiência.
              </p>
              <Link
                to={logado ? "/dashboard" : "/auth"}
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-navy px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-navy-soft"
              >
                <Compass className="h-5 w-5 text-gold" />
                Acessar o painel
                <ArrowRight className="h-4 w-4" />
              </Link>

              <ul className="mt-10 grid gap-5 sm:grid-cols-3">
                {beneficios.map((b) => (
                  <li key={b.titulo} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky/15">
                      <b.icone className="h-5 w-5 text-ocean" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy">{b.titulo}</span>
                      <span className="block text-xs text-slate-500">{b.texto}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <PreviewPainel />
            </div>
          </div>

          <div className="relative -mb-px">
            <svg viewBox="0 0 1440 120" className="block h-16 w-full sm:h-24" preserveAspectRatio="none">
              <path
                d="M0,64 C240,120 480,10 720,42 C960,74 1200,120 1440,72 L1440,120 L0,120 Z"
                fill="#0B1F3A"
              />
              <path
                d="M0,58 C240,114 480,4 720,36 C960,68 1200,114 1440,66"
                fill="none"
                stroke="#D6A84F"
                strokeWidth="2"
              />
            </svg>
          </div>
        </section>

        <section className="bg-navy">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 pt-16 sm:grid-cols-3">
            {destaques.map((d) => (
              <div
                key={d.titulo}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-7"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-sky/30 bg-ocean/25">
                  <d.icone className="h-6 w-6 text-sky" />
                </span>
                <h2 className="mt-5 font-display text-xl font-bold text-white">{d.titulo}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{d.texto}</p>
                <span className="mt-6 block h-0.5 w-12 rounded bg-gold" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
