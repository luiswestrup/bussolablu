DO $$
DECLARE
  v_conta uuid := 'c717659a-f259-4219-8a5c-5f9c9cd459f6';
  rec RECORD;
  novo_id uuid;
BEGIN
  FOR rec IN
    WITH dup AS (
      SELECT e.id AS linha_id,
             e.conta_receber_id,
             e.data,
             e.valor,
             e.descricao,
             row_number() OVER (PARTITION BY e.conta_receber_id ORDER BY e.id) AS rn
      FROM public.extrato_bancario_linha e
      WHERE e.conta_bancaria_id = v_conta
        AND e.conta_receber_id IS NOT NULL
    )
    SELECT d.linha_id, d.data, d.valor, d.descricao, r.*
    FROM dup d
    JOIN public.conta_receber r ON r.id = d.conta_receber_id
    WHERE d.rn > 1
  LOOP
    INSERT INTO public.conta_receber (
      empresa_id, descricao, valor, categoria_id, cliente_id, forma_recebimento,
      data_vencimento, data_recebimento, status, conta_bancaria_id,
      conciliado, conciliado_em, valor_recebido, valor_desconto, valor_multa_juros,
      percentual_taxa_maquininha, valor_taxa_maquininha, numero_documento, observacao
    ) VALUES (
      rec.empresa_id,
      COALESCE(rec.descricao, rec.descricao),
      ABS(rec.valor),
      rec.categoria_id,
      rec.cliente_id,
      rec.forma_recebimento,
      rec.data,
      rec.data,
      'recebido',
      v_conta,
      true,
      now(),
      ABS(rec.valor),
      0,
      0,
      rec.percentual_taxa_maquininha,
      rec.valor_taxa_maquininha,
      rec.numero_documento,
      'Criado a partir da linha do extrato bancario (conciliacao 1 para 1).'
    )
    RETURNING id INTO novo_id;

    UPDATE public.extrato_bancario_linha
    SET conta_receber_id = novo_id,
        status = 'conciliado'
    WHERE id = rec.linha_id;
  END LOOP;
END $$;