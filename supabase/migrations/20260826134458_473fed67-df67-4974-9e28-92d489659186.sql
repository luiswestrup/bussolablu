ALTER TABLE public.conta_pagar
  ADD COLUMN IF NOT EXISTS numero_nfse text,
  ADD COLUMN IF NOT EXISTS prestador_cnpj text,
  ADD COLUMN IF NOT EXISTS xml_hash text;

ALTER TABLE public.conta_receber
  ADD COLUMN IF NOT EXISTS numero_nfse text,
  ADD COLUMN IF NOT EXISTS prestador_cnpj text,
  ADD COLUMN IF NOT EXISTS xml_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conta_pagar_nfse
  ON public.conta_pagar (empresa_id, numero_nfse, prestador_cnpj)
  WHERE numero_nfse IS NOT NULL AND prestador_cnpj IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conta_receber_nfse
  ON public.conta_receber (empresa_id, numero_nfse, prestador_cnpj)
  WHERE numero_nfse IS NOT NULL AND prestador_cnpj IS NOT NULL;