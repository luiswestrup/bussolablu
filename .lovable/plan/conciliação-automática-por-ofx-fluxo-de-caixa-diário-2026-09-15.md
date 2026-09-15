# Conciliação automática por OFX + Fluxo de caixa diário

Duas entregas independentes: importar o extrato do banco e conciliar sozinho, e uma tela nova de fluxo de caixa dia a dia.

## 1. Importar extrato (OFX) e conciliar automaticamente

Dentro da tela de Conciliação bancária, um novo bloco "Importar extrato do banco":

- Escolher a conta bancária e enviar o arquivo `.ofx` baixado do internet banking.
- O sistema lê cada lançamento do extrato (data, valor, histórico) e guarda como movimento importado, evitando repetir o mesmo lançamento se o arquivo for enviado duas vezes.
- Para cada linha do extrato, procura no sistema um pagamento ou recebimento já baixado naquela conta com **o mesmo valor e data com até 3 dias de diferença**. Achando exatamente um candidato, marca o lançamento como conciliado automaticamente.
- Resultado da importação em três grupos:
  - **Conciliados automaticamente** — quantos e quais.
  - **Divergências** — linha do extrato sem correspondência, ou com mais de um candidato possível (aqui o usuário escolhe manualmente qual lançamento casar, ou ignora a linha).
  - **No sistema, mas não no extrato** — lançamentos baixados no período do arquivo que o banco não trouxe; ficam em destaque como alerta.
- Um resumo no topo mostra total de linhas do extrato, valor somado e a diferença contra o saldo do sistema no mesmo período.
- A marcação manual que já existe hoje continua funcionando normalmente.

## 2. Tela de Fluxo de Caixa

Nova aba no menu, "Fluxo de caixa", disponível para Administrador e Financeiro:

- Filtros: empresa (usa o seletor de empresa já existente, incluindo a visão "Todas") e período, com padrão no mês atual.
- Tabela por dia: entradas, saídas, resultado do dia e saldo acumulado, partindo do saldo real das contas no dia anterior ao início do período.
- Dias passados usam o que já foi efetivamente pago/recebido; dias futuros usam vencimentos em aberto — cada linha indica se é realizado ou previsto, e o saldo acumulado segue como projeção.
- Transferências entre contas não entram no total (não mudam o caixa da empresa), exceto na visão por conta.
- Gráfico de barras entradas x saídas por dia, com linha de saldo acumulado, e destaque em vermelho para dias de saldo projetado negativo.
- Clicar num dia abre a lista dos lançamentos daquele dia.
- Cartões no topo: total de entradas, total de saídas, resultado do período e menor saldo projetado.
- Exportação em CSV e Excel no mesmo padrão dos outros relatórios.

## Detalhes técnicos

- Migration: tabela `extrato_bancario_linha` (empresa_id, conta_bancaria_id, data, valor, descricao, fitid, hash, status `pendente|conciliado|ignorado`, `conta_pagar_id`/`conta_receber_id`, timestamps), com GRANTs, RLS por `pertence_empresa(empresa_id)` e índice único `(conta_bancaria_id, fitid)` para deduplicar reimportações.
- Parser OFX em `src/lib/ofx.ts`, client-side (SGML simples: blocos `STMTTRN` com `DTPOSTED`, `TRNAMT`, `FITID`, `MEMO`/`NAME`), tolerante a OFX 1.x e 2.x, com datas convertidas em fuso local como no resto do sistema.
- Casamento automático em `src/lib/conciliacao.ts`: candidatos por conta + valor absoluto igual + sinal compatível + `|data extrato − data baixa| <= 3`; um candidato → concilia e grava vínculo; zero ou vários → divergência.
- Novo componente `src/components/ImportarExtrato.tsx` embutido em `src/routes/_authenticated/conciliacao.tsx`, reaproveitando `atualizarEmLote`, `saldoContaAte` e os KPIs existentes.
- Nova rota `src/routes/_authenticated/fluxo-caixa.tsx` com `head()` próprio, alimentada por `usePagar`, `useReceber`, `useTransferencias`, `useContasBancarias` e `saldoContaAte`; gráfico com Recharts (composed: barras + linha); exportação via `exportarCSV` e o utilitário XLSX já usado em Relatórios.
- Menu em `AppShell.tsx` e permissões em `src/lib/papel.tsx` (`/fluxo-caixa`: admin, financeiro).
