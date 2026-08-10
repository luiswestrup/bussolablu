import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  FileBarChart,
  Building2,
  LogOut,
  Menu,
  FileUp,
  CalendarDays,
  ListChecks,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { TODAS } from "@/lib/empresa";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { podeAcessar, usePapel, ROTULO_PAPEL } from "@/lib/papel";
import iconeAsset from "@/assets/bussola-blu-icone.png.asset.json";

const itens = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pagamentos", label: "Pagamentos", icon: ArrowDownCircle },
  { to: "/recebimentos", label: "Recebimentos", icon: ArrowUpCircle },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/conciliacao", label: "Conciliação", icon: ListChecks },
  { to: "/importar-notas", label: "Importar NF-e", icon: FileUp },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/configuracoes", label: "Configurações", icon: Building2 },
] as const;

const CHAVE_RECOLHIDA = "bussola-blu:sidebar-recolhida";

export function AppShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { empresas, empresaId, setEmpresaId, podeConsolidar, consolidado } = useEmpresa();
  const { papel, carregando: carregandoPapel } = usePapel();
  const [aberto, setAberto] = useState(false);
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_RECOLHIDA);
    if (salvo !== null) setRecolhida(salvo === "1");
    else setRecolhida(window.matchMedia("(max-width: 1279px)").matches);
  }, []);

  const alternarRecolhida = () =>
    setRecolhida((v) => {
      localStorage.setItem(CHAVE_RECOLHIDA, v ? "0" : "1");
      return !v;
    });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const itensVisiveis = itens.filter((i) => podeAcessar(i.to, papel));
  const liberado = podeAcessar(pathname, papel);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-[transform,width] duration-200 ease-out lg:static lg:translate-x-0",
          recolhida ? "w-64 lg:w-16" : "w-64",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5",
            recolhida && "lg:justify-center lg:px-0",
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white p-0.5">
            <img
              src={iconeAsset.url}
              alt="Bussola Blu"
              className="h-full w-full object-contain"
            />
          </div>
          <span className={cn("text-sm font-semibold tracking-tight", recolhida && "lg:hidden")}>
            Bussola Blu
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {itensVisiveis.map((i) => {
            const ativo = pathname.startsWith(i.to);
            const link = (
              <Link
                key={i.to}
                to={i.to}
                onClick={() => setAberto(false)}
                aria-label={i.label}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  recolhida && "lg:justify-center lg:gap-0 lg:px-0",
                  ativo
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <i.icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", recolhida && "lg:hidden")}>{i.label}</span>
              </Link>
            );
            if (!recolhida) return link;
            return (
              <Tooltip key={i.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="hidden lg:block">
                  {i.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <button
            onClick={alternarRecolhida}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "hidden w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 lg:flex",
              recolhida && "lg:justify-center lg:gap-0 lg:px-0",
            )}
          >
            {recolhida ? (
              <ChevronsRight className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronsLeft className="h-4 w-4 shrink-0" />
            )}
            <span className={cn(recolhida && "lg:hidden")}>Recolher menu</span>
          </button>
          <button
            onClick={sair}
            aria-label="Sair"
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60",
              recolhida && "lg:justify-center lg:gap-0 lg:px-0",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(recolhida && "lg:hidden")}>Sair</span>
          </button>
        </div>
      </aside>

      {aberto && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setAberto(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-base font-semibold lg:text-lg">{titulo}</h1>
          <div className="ml-auto flex items-center gap-3">
            {papel && (
              <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline">
                {ROTULO_PAPEL[papel]}
              </span>
            )}
            <Select value={empresaId ?? ""} onValueChange={setEmpresaId}>
              <SelectTrigger className="w-[190px] sm:w-[240px]">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {podeConsolidar && (
                  <SelectItem value={TODAS}>Todas as empresas (consolidado)</SelectItem>
                )}
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>
        {consolidado && (
          <div className="flex items-center gap-2 border-b bg-primary/10 px-4 py-2 text-sm text-primary lg:px-6">
            <Layers className="h-4 w-4 shrink-0" />
            <span className="font-medium">Visão consolidada</span>
            <span className="truncate text-primary/80">
              — {empresas.map((e) => e.nome).join(" + ")}. Os totais são somados apenas para
              exibição; cada lançamento continua registrado na sua empresa.
            </span>
          </div>
        )}
        <main className="flex-1 p-4 lg:p-6">
          {carregandoPapel ? null : liberado ? (
            children
          ) : (
            <div className="mx-auto mt-10 max-w-md rounded-lg border bg-card p-6 text-center">
              <h2 className="text-base font-semibold">Acesso restrito</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Seu papel {papel ? `(${ROTULO_PAPEL[papel]})` : ""} não tem permissão para esta
                tela. Fale com um administrador se precisar de acesso.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}