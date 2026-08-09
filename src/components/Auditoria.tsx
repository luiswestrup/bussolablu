import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SecaoVazia } from "@/components/ui-kit";
import { useEmpresa } from "@/lib/empresa";
import { brl, dataBR, inicioDoMes, hoje } from "@/lib/format";

type Evento = {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  tabela_afetada: string;
  registro_id: string | null;
  acao: "criado" | "editado" | "excluido";
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  criado_em: string;
};

const TABELAS: Record<string, string> = {
  conta_pagar: "Contas a pagar",
  conta_receber: "Contas a receber",
  produto: "Produtos",
  movimento_estoque: "Movimentos de estoque",
};

const CAMPOS: Record<string, string> = {
  descricao: "Descrição",
  valor: "Valor",
  status: "Situação",
  data_vencimento: "Vencimento",
  data_pagamento: "Pagamento",
  data_recebimento: "Recebimento",
  forma_pagamento: "Forma de pagamento",
  forma_recebimento: "Forma de recebimento",
  categoria_id: "Categoria",
  fornecedor_id: "Fornecedor",
  cliente_id: "Cliente",
  conta_bancaria_id: "Conta bancária",
  conciliado: "Conciliado",
  conciliado_em: "Conciliado em",
  nome: "Nome",
  sku: "SKU",
  custo: "Custo",
  preco_venda: "Preço de venda",
  quantidade: "Quantidade",
  estoque_minimo: "Estoque mínimo",
  ativo: "Ativo",
  tipo: "Tipo",
  custo_unitario: "Custo unitário",
  observacao: "Observação",
  data: "Data",
  produto_id: "Produto",
};

const OCULTOS = new Set(["id", "empresa_id", "criado_em", "updated_at"]);
const MOEDA = new Set(["valor", "custo", "preco_venda", "custo_unitario"]);

function valorLegivel(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "vazio";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (MOEDA.has(campo)) return brl(Number(v));
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return dataBR(String(v));
  if (campo.endsWith("_id")) return "vinculado";
  return String(v);
}

function resumoEvento(e: Evento): string[] {
  const antes = e.dados_anteriores ?? {};
  const depois = e.dados_novos ?? {};
  if (e.acao === "criado" || e.acao === "excluido") {
    const fonte = e.acao === "criado" ? depois : antes;
    return Object.entries(fonte)
      .filter(([k, v]) => !OCULTOS.has(k) && v !== null && v !== false)
      .slice(0, 5)
      .map(([k, v]) => `${CAMPOS[k] ?? k}: ${valorLegivel(k, v)}`);
  }
  return Object.keys({ ...antes, ...depois })
    .filter((k) => !OCULTOS.has(k))
    .filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]))
    .map(
      (k) =>
        `${CAMPOS[k] ?? k}: ${valorLegivel(k, antes[k])} → ${valorLegivel(k, depois[k])}`,
    );
}

const TOM: Record<Evento["acao"], string> = {
  criado: "bg-success/15 text-success",
  editado: "bg-primary/15 text-primary",
  excluido: "bg-destructive/15 text-destructive",
};

export function Auditoria() {
  const { escopo, nomeEmpresa, consolidado } = useEmpresa();
  const [tabelaFiltro, setTabelaFiltro] = useState("todas");
  const [usuarioFiltro, setUsuarioFiltro] = useState("todos");
  const [de, setDe] = useState(inicioDoMes());
  const [ate, setAte] = useState(hoje());

  const { data: eventos = [] } = useQuery({
    queryKey: ["auditoria", escopo.join(","), de, ate],
    enabled: escopo.length > 0,
    queryFn: async () => {
      const q = supabase.from("auditoria" as never) as unknown as {
        select: (c: string) => {
          in: (k: string, v: string[]) => {
            gte: (k: string, v: string) => {
              lte: (k: string, v: string) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => {
                  limit: (
                    n: number,
                  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
                };
              };
            };
          };
        };
      };
      const { data, error } = await q
        .select(
          "id, empresa_id, usuario_id, tabela_afetada, registro_id, acao, dados_anteriores, dados_novos, criado_em",
        )
        .in("empresa_id", escopo)
        .gte("criado_em", `${de}T00:00:00`)
        .lte("criado_em", `${ate}T23:59:59`)
        .order("criado_em", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as Evento[];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios_da_empresa"],
    queryFn: async () => {
      const { data, error } = await (
        supabase as unknown as {
          rpc: (n: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
        }
      ).rpc("usuarios_da_empresa");
      if (error) throw new Error(error.message);
      return (data ?? []) as { user_id: string; email: string }[];
    },
  });

  const emailDe = (id: string | null) =>
    id ? (usuarios.find((u) => u.user_id === id)?.email ?? "Usuário removido") : "Sistema";

  const lista = useMemo(
    () =>
      eventos.filter(
        (e) =>
          (tabelaFiltro === "todas" || e.tabela_afetada === tabelaFiltro) &&
          (usuarioFiltro === "todos" || e.usuario_id === usuarioFiltro),
      ),
    [eventos, tabelaFiltro, usuarioFiltro],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Auditoria de alterações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tabelaFiltro} onValueChange={setTabelaFiltro}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as tabelas</SelectItem>
              {Object.entries(TABELAS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={usuarioFiltro} onValueChange={setUsuarioFiltro}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os usuários</SelectItem>
              {usuarios.map((u) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" className="w-[160px]" value={de} onChange={(e) => setDe(e.target.value)} />
          <Input type="date" className="w-[160px]" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>

        <div className="mt-4">
          {lista.length === 0 ? (
            <SecaoVazia texto="Nenhum evento no período selecionado." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Usuário</TableHead>
                  {consolidado && <TableHead>Empresa</TableHead>}
                  <TableHead>Onde</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>O que mudou</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((e) => {
                  const mudancas = resumoEvento(e);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {dataBR(e.criado_em.slice(0, 10))} {e.criado_em.slice(11, 16)}
                      </TableCell>
                      <TableCell className="text-sm">{emailDe(e.usuario_id)}</TableCell>
                      {consolidado && <TableCell className="text-sm">{nomeEmpresa(e.empresa_id)}</TableCell>}
                      <TableCell className="text-sm">
                        {TABELAS[e.tabela_afetada] ?? e.tabela_afetada}
                      </TableCell>
                      <TableCell>
                        <Badge className={TOM[e.acao]} variant="secondary">
                          {e.acao === "excluido" ? "excluído" : e.acao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {mudancas.length === 0 ? (
                          <span className="text-muted-foreground">Sem alterações relevantes</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {mudancas.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}