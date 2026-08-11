ALTER TABLE public.conta_receber
  ADD COLUMN IF NOT EXISTS percentual_taxa_maquininha numeric,
  ADD COLUMN IF NOT EXISTS valor_taxa_maquininha numeric;