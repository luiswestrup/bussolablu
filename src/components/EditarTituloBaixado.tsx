import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR, hoje } from "@/lib/format";
import { tabela, useCategorias, useContasBancarias, useNaturezas, type Categoria } from "@/lib/dados";

export type TituloBaixadoConfig = {
  tipo: "pagar" | "receber";
  tabelaNome: "conta_pagar" | "conta_receber";
  campoData: "data_pagamento" | "data_recebimento";
  campoForma: "forma_pagamento" | "forma_recebimento";
  campoValor: "valor_pago" | "valor_recebido";
  tipoCategoria: Categoria["tipo"];
};

type Registro = Record<string, unknown>;

const ROTULOS: Record<string, string> = {
  valor_pago: "Valor pago",
  valor_recebido: "Valor recebido",
  data_pagamento: "Data de pagamento",
  data_recebimento: "Data de recebimento",
  forma_pagamento: "Forma de pagamento",
  forma_recebimento: "Forma de recebimento",
  conta_bancaria_id: "Conta bancária",
  categoria_id: "Categoria",
  observacao: "Observação",
};

type LinhaHistorico = {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  editado_em: string;
  usuario_id: string | null;
};

export function EditarTituloBaixado({
  config,
  conta,
  formas,
  onClose,
}: {
  config: TituloBaixadoConfig;
  conta: Registro | null;
  formas: string[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const empresaId = (conta?.["empresa_id"] as string) ?? "";
  const { data: categorias = [] } = useCategorias(empresaId || undefined);
  const { data: naturezas = [] } = useNaturezas(empresaId || undefined);
  const { data: contasBancarias = [] } = useContasBancarias(empresaId || undefined);

  const registroId = (conta?.["id"] as string) ?? "";
  const original = useMemo(
    () => ({
      valor: String(conta?.[config.campoValor] ?? conta?.["valor"] ?? ""),
      data: (conta?.[config.campoData] as string) ?? "",
      forma: (conta?.[config.campoForma] as string) ?? "",
      conta_bancaria_id: (conta?.["conta_bancaria_id"] as string) ?? "",
      categoria_id: (conta?.["categoria_id"] as string) ?? "",
      observacao: (conta?.["observacao"] as string) ?? "",
    }),
    [conta, config],
  );

  const [form, setForm] = useState(original);
  const [chaveForm, setChaveForm] = useState(registroId);
  const [natureza, setNatureza] = useState("");
  const [verHistorico, setVerHistorico] = useState(false);

  // Reinicia o formulário quando outro título é aberto.
  if (registroId && chaveForm !== registroId) {
    setChaveForm(registroId);
    setForm(original);
    setNatureza(
      (categorias.find((c) => c.id === original.categoria_id)?.natureza_id as string) ?? "",
    );
    setVerHistorico(false);
  }

  const categoriasVisiveis = categorias
    .filter((c) => c.tipo === config.tipoCategoria)
    .filter((c) => (natureza ? c.natureza_id === natureza : true));

  const historico = useQuery({
    queryKey: ["historico_edicoes", config.tabelaNome, registroId],
    enabled: verHistorico && !!registroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_edicoes")
        .select("id, campo_alterado, valor_anterior, valor_novo, editado_em, usuario_id")
        .eq("tabela_origem", config.tabelaNome)
        .eq("registro_id", registroId)
        .order("editado_em", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as LinhaHistorico[];
    },
  });

  const rotuloValor = (campo: string, valor: string | null) => {
    if (!valor) return "—";
    if (campo === "categoria_id") return categorias.find((c) => c.id === valor)?.nome ?? valor;
    if (campo === "conta_bancaria_id")
      return contasBancarias.find((c) => c.id === valor)?.banco ?? valor;
    if (campo.startsWith("valor")) return brl(Number(valor));
    if (campo.startsWith("data")) return dataBR(valor);
    return valor;
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const valor = Number(form.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error("O valor efetivo precisa ser maior que zero.");
      }
      if (!form.data) throw new Error("Informe a data.");
      if (form.data > hoje()) throw new Error("A data não pode ser futura.");

      const novos: Record<string, string | number | null> = {
        [config.campoValor]: valor,
        [config.campoData]: form.data,
        [config.campoForma]: form.forma || null,
        conta_bancaria_id: form.conta_bancaria_id || null,
        categoria_id: form.categoria_id || null,
        observacao: form.observacao.trim() || null,
      };
      const antigos: Record<string, string | number | null> = {
        [config.campoValor]: original.valor === "" ? null : Number(original.valor),
        [config.campoData]: original.data || null,
        [config.campoForma]: original.forma || null,
        conta_bancaria_id: original.conta_bancaria_id || null,
        categoria_id: original.categoria_id || null,
        observacao: original.observacao || null,
      };

      const alterados = Object.keys(novos).filter(
        (k) => String(novos[k] ?? "") !== String(antigos[k] ?? ""),
      );
      if (alterados.length === 0) throw new Error("Nenhuma alteração para salvar.");

      const { error } = await tabela(config.tabelaNome).update(novos).eq("id", registroId);
      if (error) throw new Error(error.message);

      const { data: sessao } = await supabase.auth.getUser();
      const linhas = alterados.map((campo) => ({
        empresa_id: empresaId,
        tabela_origem: config.tabelaNome,
        registro_id: registroId,
        campo_alterado: campo,
        valor_anterior: antigos[campo] === null ? null : String(antigos[campo]),
        valor_novo: novos[campo] === null ? null : String(novos[campo]),
        usuario_id: sessao.user?.id ?? null,
      }));
      const { error: erroLog } = await supabase.from("historico_edicoes").insert(linhas);
      if (erroLog) throw new Error(`Alteração salva, mas o histórico falhou: ${erroLog.message}`);
    },
    onSuccess: () => {
      // Saldo de caixa, dashboard e relatórios precisam refletir os novos valores.
      queryClient.invalidateQueries();
      toast.success("Título atualizado.");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmarESalvar = () => {
    const mudouValor = String(Number(form.valor)) !== String(Number(original.valor));
    if (mudouValor && !window.confirm("Isso vai alterar o saldo de caixa já calculado. Confirmar?")) {
      return;
    }
    salvar.mutate();
  };

  return (
    <Dialog open={!!conta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar título {config.tipo === "pagar" ? "pago" : "recebido"}
          </DialogTitle>
        </DialogHeader>

        {conta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-muted-foreground">
              {String(conta["descricao"] ?? "")} · valor original{" "}
              {brl(Number(conta["valor"] ?? 0))} · o status não muda por aqui (use o estorno).
            </p>

            <div className="grid gap-2">
              <Label>{config.tipo === "pagar" ? "Valor pago" : "Valor recebido"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>{config.tipo === "pagar" ? "Data de pagamento" : "Data de recebimento"}</Label>
              <Input
                type="date"
                max={hoje()}
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>{config.tipo === "pagar" ? "Forma de pagamento" : "Forma de recebimento"}</Label>
              <Select
                value={form.forma || "nenhuma"}
                onValueChange={(v) => setForm({ ...form, forma: v === "nenhuma" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Não informado</SelectItem>
                  {formas.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Conta bancária</Label>
              <Select
                value={form.conta_bancaria_id || "nenhuma"}
                onValueChange={(v) =>
                  setForm({ ...form, conta_bancaria_id: v === "nenhuma" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Não informado</SelectItem>
                  {contasBancarias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.banco}
                      {c.conta ? ` · ${c.conta}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Natureza</Label>
              <Select
                value={natureza || "todas"}
                onValueChange={(v) => setNatureza(v === "todas" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {naturezas.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={form.categoria_id || "nenhuma"}
                onValueChange={(v) => setForm({ ...form, categoria_id: v === "nenhuma" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Sem categoria</SelectItem>
                  {categoriasVisiveis.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label>Observação</Label>
              <Input
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                placeholder="Motivo da correção, referência etc."
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="link"
                className="h-auto px-0"
                onClick={() => setVerHistorico((v) => !v)}
              >
                <History className="mr-1 h-4 w-4" />
                {verHistorico ? "Ocultar histórico de edições" : "Ver histórico de edições"}
              </Button>

              {verHistorico && (
                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
                  {historico.isLoading && <p className="text-muted-foreground">Carregando…</p>}
                  {!historico.isLoading && (historico.data?.length ?? 0) === 0 && (
                    <p className="text-muted-foreground">Nenhuma edição registrada.</p>
                  )}
                  {historico.data?.map((h) => (
                    <div key={h.id} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.editado_em).toLocaleString("pt-BR")} ·{" "}
                        {h.usuario_id ? `usuário ${h.usuario_id.slice(0, 8)}` : "sistema"}
                      </p>
                      <p>
                        <span className="font-medium">
                          {ROTULOS[h.campo_alterado] ?? h.campo_alterado}
                        </span>
                        : {rotuloValor(h.campo_alterado, h.valor_anterior)} →{" "}
                        {rotuloValor(h.campo_alterado, h.valor_novo)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmarESalvar} disabled={salvar.isPending}>
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
