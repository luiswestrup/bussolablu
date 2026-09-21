import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { brl, dataBR } from "@/lib/format";
import { useEmpresa } from "@/lib/empresa";
import {
  atualizarEmLote,
  inserirVarios,
  tabela,
  useContasBancarias,
  useExtratoLinhas,
  usePagar,
  useReceber,
  type ContaPagar,
  type ContaReceber,
  type ExtratoLinha,
} from "@/lib/dados";
import { lerOFX, type LancamentoOFX } from "@/lib/ofx";
import { candidatosDaConta, casarLinhas, type Candidato, type Resultado } from "@/lib/conciliacao";
import { LancarDoExtrato, type VinculoCriado } from "@/components/LancarDoExtrato";

export function ImportarExtrato({
  contaId,
  onContaId,
}: {
  contaId: string;
  onContaId: (v: string) => void;
}) {
  const { escopo } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: contas = [] } = useContasBancarias(escopo);
  const { data: pagar = [] } = usePagar(escopo);
  const { data: receber = [] } = useReceber(escopo);
  const { data: linhasSalvas = [] } = useExtratoLinhas(escopo);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [lidas, setLidas] = useState<LancamentoOFX[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  // Linhas da prévia que o usuário lançou manualmente no sistema (chave = hash).
  const [manuais, setManuais] = useState<Record<string, VinculoCriado>>({});

  const empresaDaConta = contas.find((c) => c.id === contaId)?.empresa_id ?? "";

  const candidatos = useMemo(
    () => (contaId ? candidatosDaConta(contaId, pagar, receber) : []),
    [contaId, pagar, receber],
  );

  const hashesExistentes = useMemo(
    () => new Set(linhasSalvas.filter((l) => l.conta_bancaria_id === contaId).map((l) => l.hash)),
    [linhasSalvas, contaId],
  );

  const novas = useMemo(() => lidas.filter((l) => !hashesExistentes.has(l.hash)), [lidas, hashesExistentes]);
  const resultados = useMemo(() => casarLinhas(novas, candidatos), [novas, candidatos]);
  const automaticos = resultados.filter((r) => r.candidatos.length === 1);
  const lancados = resultados.filter((r) => r.candidatos.length !== 1 && manuais[r.linha.hash]);
  const divergentes = resultados.filter(
    (r) => r.candidatos.length !== 1 && !manuais[r.linha.hash],
  );

  const periodo = useMemo(() => {
    if (!lidas.length) return null;
    const datas = lidas.map((l) => l.data).sort();
    return { de: datas[0]!, ate: datas[datas.length - 1]! };
  }, [lidas]);

  // Lançamentos baixados no período do arquivo que o extrato não trouxe.
  const semExtrato = useMemo(() => {
    if (!periodo || !contaId || !lidas.length) return [] as Candidato[];
    const casados = new Set(
      resultados
        .filter((r) => r.candidatos.length === 1)
        .map((r) => `${r.candidatos[0]!.tabela}:${r.candidatos[0]!.id}`),
    );
    return candidatos.filter(
      (c) =>
        c.data >= periodo.de &&
        c.data <= periodo.ate &&
        !casados.has(`${c.tabela}:${c.id}`) &&
        !c.conciliado,
    );
  }, [periodo, contaId, lidas, resultados, candidatos]);

  async function lerArquivo(file: File) {
    const texto = await file.text();
    const linhas = lerOFX(texto);
    if (!linhas.length) {
      toast.error("Nenhum lançamento encontrado no arquivo OFX.");
      return;
    }
    setLidas(linhas);
    setNomeArquivo(file.name);
    toast.success(`${linhas.length} lançamento(s) lidos de ${file.name}.`);
  }

  async function importar() {
    if (!contaId) return;
    const conta = contas.find((c) => c.id === contaId);
    if (!conta) return;
    setSalvando(true);
    try {
      const registros = resultados.map((r) => {
        const manual = manuais[r.linha.hash];
        const unico = manual
          ? manual.tabela === "transferencia"
            ? null
            : { tabela: manual.tabela, id: manual.id }
          : r.candidatos.length === 1
            ? { tabela: r.candidatos[0]!.tabela, id: r.candidatos[0]!.id }
            : null;
        return {
          empresa_id: conta.empresa_id,
          conta_bancaria_id: contaId,
          data: r.linha.data,
          valor: r.linha.valor,
          descricao: r.linha.descricao,
          fitid: r.linha.fitid,
          hash: r.linha.hash,
          status: unico || manual ? "conciliado" : "pendente",
          conta_pagar_id: unico?.tabela === "conta_pagar" ? unico.id : null,
          conta_receber_id: unico?.tabela === "conta_receber" ? unico.id : null,
        };
      });
      await inserirVarios("extrato_bancario_linha", registros);

      const marca = { conciliado: true, conciliado_em: new Date().toISOString() };
      for (const t of ["conta_pagar", "conta_receber"] as const) {
        const ids = automaticos
          .map((r) => r.candidatos[0]!)
          .filter((c) => c.tabela === t)
          .map((c) => c.id);
        await atualizarEmLote(t, ids, marca);
      }
      await invalidar();
      setLidas([]);
      setNomeArquivo("");
      if (arquivoRef.current) arquivoRef.current.value = "";
      toast.success(
        `${automaticos.length} lançamento(s) conciliados automaticamente. ${divergentes.length} divergência(s) para revisar.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar o extrato.");
    } finally {
      setSalvando(false);
    }
  }

  async function invalidar() {
    await queryClient.invalidateQueries({ queryKey: ["conta_pagar"] });
    await queryClient.invalidateQueries({ queryKey: ["conta_receber"] });
    await queryClient.invalidateQueries({ queryKey: ["extrato_bancario_linha"] });
  }

  async function resolverPendente(linha: ExtratoLinha, escolha: string) {
    try {
      if (escolha === "ignorar") {
        await tabela("extrato_bancario_linha")
          .update({ status: "ignorado", conta_pagar_id: null, conta_receber_id: null })
          .eq("id", linha.id);
      } else {
        const [t, id] = escolha.split(":") as ["conta_pagar" | "conta_receber", string];
        await tabela("extrato_bancario_linha")
          .update({
            status: "conciliado",
            conta_pagar_id: t === "conta_pagar" ? id : null,
            conta_receber_id: t === "conta_receber" ? id : null,
          })
          .eq("id", linha.id);
        await atualizarEmLote(t, [id], {
          conciliado: true,
          conciliado_em: new Date().toISOString(),
        });
      }
      await invalidar();
      toast.success("Linha do extrato atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar a linha.");
    }
  }

  const pendentesSalvas = linhasSalvas.filter(
    (l) => l.conta_bancaria_id === contaId && l.status === "pendente",
  );

  const rotuloCandidato = (c: Candidato) =>
    `${dataBR(c.data)} · ${brl(c.valor)} · ${c.descricao}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="h-4 w-4" /> Importar extrato do banco (OFX)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>Conta bancária</Label>
            <Select value={contaId} onValueChange={onContaId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.banco} {c.conta ? `· ${c.conta}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ofx">Arquivo .ofx</Label>
            <input
              id="ofx"
              ref={arquivoRef}
              type="file"
              accept=".ofx,.OFX,text/plain"
              disabled={!contaId}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void lerArquivo(f);
              }}
              className="block w-[260px] rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>
          <Button disabled={!contaId || !resultados.length || salvando} onClick={() => void importar()}>
            <Upload className="mr-2 h-4 w-4" /> Importar e conciliar ({resultados.length})
          </Button>
        </div>

        {!contaId && (
          <p className="text-sm text-muted-foreground">
            Selecione a conta bancária antes de enviar o arquivo.
          </p>
        )}

        {!!lidas.length && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm text-muted-foreground">
              {nomeArquivo} · {lidas.length} linha(s)
              {periodo ? ` de ${dataBR(periodo.de)} a ${dataBR(periodo.ate)}` : ""} · soma{" "}
              {brl(lidas.reduce((s, l) => s + l.valor, 0))} ·{" "}
              {lidas.length - novas.length} já importada(s) antes.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Resumo titulo="Conciliam automaticamente" valor={automaticos.length} tom="ok" />
              <Resumo titulo="Divergências a revisar" valor={divergentes.length} tom="alerta" />
              <Resumo titulo="No sistema, fora do extrato" valor={semExtrato.length} tom="alerta" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Histórico do banco</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map((r: Resultado) => (
                  <TableRow key={r.linha.hash}>
                    <TableCell className="whitespace-nowrap">{dataBR(r.linha.data)}</TableCell>
                    <TableCell>{r.linha.descricao}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        r.linha.valor < 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {brl(r.linha.valor)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.candidatos.length === 1 ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {rotuloCandidato(r.candidatos[0]!)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {r.candidatos.length === 0
                            ? "Sem correspondência no sistema"
                            : `${r.candidatos.length} lançamentos possíveis`}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!!semExtrato.length && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p className="mb-2 font-medium text-destructive">
                  Baixados no sistema, mas ausentes no extrato
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {semExtrato.map((c) => (
                    <li key={`${c.tabela}-${c.id}`}>{rotuloCandidato(c)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!!pendentesSalvas.length && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
              Divergências do extrato aguardando revisão ({pendentesSalvas.length})
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Resolver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentesSalvas.map((l) => {
                  const opcoes = candidatos.filter(
                    (c) =>
                      Math.sign(c.valor) === Math.sign(Number(l.valor)) &&
                      Math.abs(Math.abs(c.valor) - Math.abs(Number(l.valor))) < 0.01,
                  );
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap">{dataBR(l.data)}</TableCell>
                      <TableCell>{l.descricao}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          Number(l.valor) < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {brl(Number(l.valor))}
                      </TableCell>
                      <TableCell>
                        <Select onValueChange={(v) => void resolverPendente(l, v)}>
                          <SelectTrigger className="w-[320px]">
                            <SelectValue placeholder="Escolher lançamento ou ignorar" />
                          </SelectTrigger>
                          <SelectContent>
                            {opcoes.map((c) => (
                              <SelectItem key={`${c.tabela}-${c.id}`} value={`${c.tabela}:${c.id}`}>
                                {rotuloCandidato(c)}
                              </SelectItem>
                            ))}
                            <SelectItem value="ignorar">Ignorar esta linha</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Resumo({
  titulo,
  valor,
  tom,
}: {
  titulo: string;
  valor: number;
  tom: "ok" | "alerta";
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          valor === 0 ? "" : tom === "ok" ? "text-success" : "text-destructive",
        )}
      >
        {valor}
      </p>
    </div>
  );
}

