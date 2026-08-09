import { createFileRoute } from "@tanstack/react-router";
import { ContasView } from "@/components/ContasView";
import { useEmpresa } from "@/lib/empresa";
import { useFornecedores, usePagar } from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({
    meta: [
      { title: "Contas a pagar — Fluxo Gestão" },
      { name: "description", content: "Lance, filtre e baixe contas a pagar por categoria e fornecedor." },
      { property: "og:title", content: "Contas a pagar — Fluxo Gestão" },
      { property: "og:description", content: "Gestão de pagamentos com filtros, baixa e exportação em CSV." },
    ],
  }),
  component: PagamentosPage,
});

function PagamentosPage() {
  const { escopo } = useEmpresa();
  const { data: contas = [], isLoading } = usePagar(escopo);
  const { data: fornecedores = [] } = useFornecedores(escopo);

  return (
    <ContasView
      config={{
        tipo: "pagar",
        tabelaNome: "conta_pagar",
        titulo: "Contas a pagar",
        statusFinal: "pago",
        campoData: "data_pagamento",
        campoForma: "forma_pagamento",
        campoParceiro: "fornecedor_id",
        rotuloParceiro: "Fornecedor",
        tipoCategoria: "despesa",
      }}
      contas={contas}
      parceiros={fornecedores}
      carregando={isLoading}
    />
  );
}