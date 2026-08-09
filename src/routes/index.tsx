import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Boxes, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
    titulo: "Caixa sob controle",
    texto: "Pagamentos e recebimentos impactam o saldo automaticamente, com alerta de vencidos.",
  },
  {
    icone: Boxes,
    titulo: "Estoque com alerta",
    texto: "Entradas, saídas e aviso automático quando o produto fica abaixo do mínimo.",
  },
  {
    icone: BarChart3,
    titulo: "Decisão com dados",
    texto: "Fluxo de caixa, despesas por categoria e lucratividade em gráficos e CSV.",
  },
];

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
    <div className="min-h-screen bg-sidebar text-sidebar-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            F
          </div>
          <span className="font-semibold">Fluxo Gestão</span>
        </div>
        <Button asChild variant="secondary">
          <Link to={logado ? "/dashboard" : "/auth"}>{logado ? "Ir para o painel" : "Entrar"}</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <section className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-sidebar-primary">
            Gestão financeira e operacional
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Todo o caixa, as contas e o estoque da sua empresa em um painel só.
          </h1>
          <p className="mt-5 text-base text-sidebar-foreground/75">
            Registre pagamentos e recebimentos, controle produtos e acompanhe indicadores em
            gráficos atualizados a cada lançamento — com suporte a mais de uma empresa.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to={logado ? "/dashboard" : "/auth"}>
                Acessar o painel <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {destaques.map((d) => (
            <div key={d.titulo} className="rounded-xl border border-sidebar-border p-6">
              <d.icone className="h-5 w-5 text-sidebar-primary" />
              <h2 className="mt-4 text-base font-semibold">{d.titulo}</h2>
              <p className="mt-2 text-sm text-sidebar-foreground/70">{d.texto}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
