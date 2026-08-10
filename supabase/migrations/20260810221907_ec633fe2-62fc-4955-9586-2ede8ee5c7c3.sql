CREATE TYPE public.status_cheque AS ENUM ('emitido','compensado','devolvido','cancelado');

ALTER TABLE public.conta_pagar
  ADD COLUMN numero_cheque text,
  ADD COLUMN banco_emissor text,
  ADD COLUMN cheque_conta_bancaria_id uuid REFERENCES public.conta_bancaria(id),
  ADD COLUMN status_cheque public.status_cheque,
  ADD COLUMN grupo_parcelamento_id uuid;

ALTER TABLE public.conta_receber
  ADD COLUMN numero_cheque text,
  ADD COLUMN banco_emissor text,
  ADD COLUMN status_cheque public.status_cheque,
  ADD COLUMN grupo_parcelamento_id uuid;

CREATE INDEX idx_conta_pagar_grupo ON public.conta_pagar(grupo_parcelamento_id);
CREATE INDEX idx_conta_receber_grupo ON public.conta_receber(grupo_parcelamento_id);