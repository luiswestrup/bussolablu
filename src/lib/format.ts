export const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const num = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(v ?? 0));

export function dataBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const hoje = () => new Date().toISOString().slice(0, 10);

export function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function fimDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function mesesAtras(n: number) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - n, 1).toISOString().slice(0, 10);
}

export function rotuloMes(iso: string) {
  const [y = "", m = ""] = iso.slice(0, 7).split("-");
  return `${m}/${y.slice(2)}`;
}

export function exportarCSV(nome: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) return;
  const cabecalho = Object.keys(linhas[0]!);
  const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    cabecalho.join(";"),
    ...linhas.map((l) => cabecalho.map((c) => escapar(l[c])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}-${hoje()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}