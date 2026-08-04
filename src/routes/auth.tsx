import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Fluxo Gestão Financeira" },
      {
        name: "description",
        content:
          "Acesse o Fluxo Gestão para controlar pagamentos, recebimentos, estoque e indicadores financeiros da sua empresa.",
      },
      { property: "og:title", content: "Entrar — Fluxo Gestão Financeira" },
      {
        property: "og:description",
        content: "Acesse o painel de pagamentos, recebimentos e estoque da sua empresa.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: window.location.origin },
    });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível cadastrar", { description: error.message });
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    toast.success("Confirme seu e-mail", {
      description: "Enviamos um link de confirmação para concluir o cadastro.",
    });
  }

  async function entrarComGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha no login com Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Fluxo Gestão</CardTitle>
          <CardDescription>
            Painel financeiro e operacional para pequenas e médias empresas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="entrar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar conta</TabsTrigger>
            </TabsList>
            {(["entrar", "criar"] as const).map((aba) => (
              <TabsContent key={aba} value={aba}>
                <form
                  onSubmit={aba === "entrar" ? entrar : cadastrar}
                  className="mt-4 space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`email-${aba}`}>E-mail</Label>
                    <Input
                      id={`email-${aba}`}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@empresa.com.br"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`senha-${aba}`}>Senha</Label>
                    <Input
                      id={`senha-${aba}`}
                      type="password"
                      required
                      minLength={6}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    {aba === "entrar" ? "Entrar" : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={entrarComGoogle}>
            Continuar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}