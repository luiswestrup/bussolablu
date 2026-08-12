WITH alvo AS (
  SELECT e.id AS empresa_id, e.nome AS empresa, v.nome, v.nat
  FROM public.empresa e
  JOIN (VALUES
    ('lagoa','Bebidas','Mercadoria'),
    ('lagoa','Carnes','Mercadoria'),
    ('lagoa','Peixes e Frutos do Mar','Mercadoria'),
    ('lagoa','Insumos de Produção','Mercadoria'),
    ('lagoa','Embalagens','Mercadoria'),
    ('principe','Combustível','Mercadoria'),
    ('principe','Peças e Manutenção de Embarcação','Mercadoria'),
    ('principe','Itens de Segurança','Mercadoria'),
    ('ambas','Serviços de Manutenção','Serviço'),
    ('ambas','Serviços Jurídicos','Serviço'),
    ('ambas','Consultoria','Serviço'),
    ('ambas','Serviços de Marketing','Serviço'),
    ('ambas','Serviços Contábeis','Serviço'),
    ('ambas','Folha de pagamento','Outro'),
    ('ambas','Aluguel','Outro'),
    ('ambas','Impostos','Outro')
  ) AS v(escopo, nome, nat)
    ON v.escopo = 'ambas'
    OR (v.escopo = 'lagoa' AND e.nome ILIKE 'Lagoa%')
    OR (v.escopo = 'principe' AND e.nome ILIKE 'Pr%ncipe%')
)
INSERT INTO public.categoria (empresa_id, nome, tipo, natureza_id)
SELECT a.empresa_id, a.nome, 'despesa'::tipo_categoria, n.id
FROM alvo a
JOIN public.natureza n ON n.empresa_id = a.empresa_id AND n.nome = a.nat
WHERE NOT EXISTS (
  SELECT 1 FROM public.categoria c
  WHERE c.empresa_id = a.empresa_id AND lower(c.nome) = lower(a.nome)
);