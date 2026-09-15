# Dashboard: legenda do gráfico de Despesas por categoria

## Contexto
No Dashboard, o gráfico de pizza "Despesas por categoria" (também usado no modo "Natureza") renderiza a legenda com TODAS as categorias de uma vez (`<Legend />` em `src/routes/_authenticated/dashboard.tsx`, ~linha 343). Com muitas categorias, a legenda fica bagunçada e espreme o gráfico.

## Mudança (somente frontend, arquivo `dashboard.tsx`)

1. **Legenda só com as 7 maiores fatias**
   - Substituir `<Legend />` por `<Legend payload={...} />` usando o payload do Recharts filtrado para as 7 primeiras entradas (os dados já vêm ordenados do maior para o menor).
   - O restante das fatias continua desenhado na pizza, mas sem rótulo na legenda.

2. **Nome no tooltip ao passar o mouse**
   - Enriquecer o `Tooltip` atual: além do valor em R$ (`tooltipMoeda` já existente), mostrar a porcentagem da fatia sobre o total de despesas. O nome da categoria já aparece no tooltip — assim as categorias menores continuam identificáveis mesmo fora da legenda.

3. **Mesmo tratamento nos dois modos**
   - Aplicar a legenda limitada tanto no modo "Categoria" quanto no modo "Natureza", pois usam o mesmo gráfico (`despesasGrafico`).

4. **Detalhes de polimento**
   - Espaço vertical do card (`h-72`) mantido; legenda menor deixa mais área visível para a pizza.
   - Se houver 7 categorias ou menos, nada muda visualmente (todas aparecem na legenda).

## Fora de escopo
- Nenhuma alteração de dados, queries ou backend.
- Outros gráficos do Dashboard permanecem como estão.
