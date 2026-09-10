DROP INDEX IF EXISTS public.uniq_conta_pagar_nfse;
DROP INDEX IF EXISTS public.uniq_conta_receber_nfse;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conta_pagar_nfse
  ON public.conta_pagar (empresa_id, numero_nfse, prestador_cnpj, COALESCE(numero_parcela, 1))
  WHERE numero_nfse IS NOT NULL AND prestador_cnpj IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conta_receber_nfse
  ON public.conta_receber (empresa_id, numero_nfse, prestador_cnpj)
  WHERE numero_nfse IS NOT NULL AND prestador_cnpj IS NOT NULL;