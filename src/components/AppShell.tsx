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
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import iconeAsset from "@/assets/bussola-blu-icone.png.asset.json";

const itens = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pagamentos", label: "Pagamentos", icon: ArrowDownCircle },
  { to: "/recebimentos", label: "Recebimentos", icon: ArrowUpCircle },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/importar-notas", label: "Importar NF-e", icon: FileUp },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/configuracoes", label: "Configurações", icon: Building2 },
] as const;

export function AppShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { empresas, empresa, setEmpresaId } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white p-0.5">
            <img
              src={iconeAsset.url}
              alt="Bussola Blu"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight">Bussola Blu</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {itens.map((i) => {
            const ativo = pathname.startsWith(i.to);
            return (
              <Link
                key={i.to}
                to={i.to}
                onClick={() => setAberto(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  ativo
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <i.icon className="h-4 w-4" />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={sair}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60"
          >
            <LogOut className="h-4 w-4" />
            Sair
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
          <div className="ml-auto">
            <Select value={empresa?.id ?? ""} onValueChange={setEmpresaId}>
              <SelectTrigger className="w-[190px] sm:w-[240px]">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}