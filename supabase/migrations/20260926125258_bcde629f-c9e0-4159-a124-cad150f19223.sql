UPDATE public.conta_pagar
SET conta_bancaria_id = 'a8089584-5b1f-4aea-b8b1-4bd471d27d70',
    cheque_conta_bancaria_id = COALESCE(cheque_conta_bancaria_id, 'a8089584-5b1f-4aea-b8b1-4bd471d27d70')
WHERE numero_cheque IS NOT NULL
  AND conta_bancaria_id IS NULL
  AND empresa_id = 'bb2829ac-5264-4ef3-adcc-a7eda9c547e2'
  AND lower(banco_emissor) IN ('itau', 'itaú');

UPDATE public.conta_pagar
SET conta_bancaria_id = 'eb9110dc-60e2-4e8c-ab79-9920a0530750',
    cheque_conta_bancaria_id = COALESCE(cheque_conta_bancaria_id, 'eb9110dc-60e2-4e8c-ab79-9920a0530750')
WHERE numero_cheque IS NOT NULL
  AND conta_bancaria_id IS NULL
  AND empresa_id = 'b1317cc6-8808-49ca-9001-2cc5da863ae3'
  AND lower(banco_emissor) LIKE 'bradesco%';