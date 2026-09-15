# Arrumar o gráfico "Despesas por categoria"

Confirmei no código: a melhoria pedida antes nunca chegou a ser aplicada. O gráfico ainda desenha uma fatia para cada categoria e a legenda lista todas elas, por isso continua bagunçado.

## O que muda

Troco a rosca por um gráfico de barras horizontais, que é o formato que lê bem quando há muitas categorias:

- As 7 maiores categorias aparecem como barras, da maior para a menor, com o nome ao lado de cada barra.
- Todas as demais entram numa única barra "Outras (N categorias)".
- Ao passar o mouse sobre "Outras", o balão lista as categorias agrupadas com seus valores (as maiores primeiro, até um limite legível) e o total.
- Cada barra mostra o valor em reais e a participação percentual sobre o total de despesas do período.
- A legenda cheia sai; ela é o que estava poluindo a área.

O botão Categoria / Natureza continua igual. Em "Natureza" há poucos itens, então praticamente tudo aparece direto, sem agrupamento.

## Detalhes técnicos

- Arquivo: `src/routes/_authenticated/dashboard.tsx`, apenas o card de despesas.
- `despesasGrafico` já vem ordenado por valor; derivo uma lista para exibição com `slice(0, 7)` mais uma linha agregada "Outras", guardando os itens agrupados para o tooltip.
- Recharts: `BarChart` com `layout="vertical"`, `YAxis` categórico com largura maior e nomes truncados, `Tooltip` com conteúdo customizado para a linha "Outras", cores vindas da constante `CORES` já existente.
- Sem mudanças em dados, consultas ou backend.
