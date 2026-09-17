# Rateio por categoria em notas com produtos variados

Hoje, quando a nota tem itens de categorias diferentes, o título de pagamento fica sem categoria. Como você escolheu manter um título só, o rateio passa a acontecer nos relatórios.

## Sobre os títulos antigos

Verifiquei: dá para saber os produtos de cada nota mesmo nos lançamentos antigos. Toda entrada de estoque criada na importação guarda o número da nota e o produto (que tem categoria). Hoje existem 419 títulos sem categoria e 408 deles têm itens rastreáveis — ou seja, quase todos podem ser rateados automaticamente, sem digitação manual.

Os poucos casos restantes (sem itens rastreáveis) continuam aparecendo como "Sem categoria".

## Como vai funcionar

- Em Relatórios e no gráfico "Despesas por categoria" do Dashboard, um título sem categoria vinda de nota será dividido entre as categorias dos produtos daquela nota, na proporção do valor de cada item.
- A soma continua batendo com o total pago: nada é duplicado nem perdido.
- Títulos com categoria definida continuam exatamente como estão.
- Quando o título é parcelado, cada parcela é rateada na mesma proporção da nota.
- Nas telas de Contas a Pagar, o título continua um só, com o indicador de "revisar categoria" já existente — a mudança é só na visão por categoria.
- Ao passar o mouse na barra do gráfico, mostramos quanto veio de rateio de notas mistas, para você conferir a origem dos valores.

## Exportações

O CSV/Excel de pagamentos mantém uma linha por título (colunas L e M como estão hoje). Acrescentamos ao relatório por categoria a indicação de valor rateado, para conferência.

## Detalhes técnicos

- Novo módulo `src/lib/rateio.ts`: dado um conjunto de títulos de `conta_pagar` sem `categoria_id` mas com `numero_documento`, busca os movimentos de estoque com `observacao = 'NF-e ' + numero_documento` na mesma empresa, soma `quantidade * custo_unitario` por `categoria_id` do produto e devolve pesos proporcionais. Itens cujo produto está sem categoria caem em "Sem categoria".
- Novo hook de leitura em `src/lib/dados.ts` (ou reuso de `useMovimentosEstoque`) para carregar os movimentos do período necessário, com cache por empresa.
- `src/routes/_authenticated/relatorios.tsx`: `porCategoria` passa a acumular via rateio em vez de lançar todo o valor em `null`; mesma mudança em `linhasCategoria`.
- `src/routes/_authenticated/dashboard.tsx`: mesmo acumulador aplicado ao gráfico de barras (7 maiores + "Outras"), com o tooltip exibindo a parcela rateada.
- Sem alterações de banco de dados e sem mexer nos dados já gravados.
