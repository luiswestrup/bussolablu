import { createFileRoute } from "@tanstack/react-router";
import { ContasView } from "@/components/ContasView";
import { useEmpresa } from "@/lib/empresa";
import { useClientes, useReceber } from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/recebimentos")({
  head: () => ({
    meta: [
      { title: "Contas a receber — Fluxo Gestão" },
      { name: "description", content: "Acompanhe recebimentos por cliente, com alerta de títulos vencidos." },
      { property: "og:title", content: "Contas a receber — Fluxo Gestão" },
      { property: "og:description", content: "Gestão de recebimentos com filtros, baixa e exportação em CSV." },
    ],
  }),
  component: RecebimentosPage,
});

function RecebimentosPage() {
  const { empresa } = useEmpresa();
  const { data: contas = [], isLoading } = useReceber(empresa?.id);
  const { data: clientes = [] } = useClientes(empresa?.id);

  return (
    <ContasView
      config={{
        tipo: "receber",
        tabelaNome: "conta_receber",
        titulo: "Contas a receber",
        statusFinal: "recebido",
        campoData: "data_recebimento",
        campoForma: "forma_recebimento",
        campoParceiro: "cliente_id",
        rotuloParceiro: "Cliente",
        tipoCategoria: "receita",
      }}
      contas={contas}
      parceiros={clientes}
      carregando={isLoading}
    />
  );
}