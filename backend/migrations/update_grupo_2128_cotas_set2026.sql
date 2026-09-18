-- Set/2026: atualiza os valores de crédito (coluna `cota`) do grupo AUTO 2128.
-- 7 novos créditos por bem_referencia (50k..80k). O simulador exibe a coluna
-- `cota` como crédito; bem_referencia é a faixa/chave e permanece inalterada.
-- 2128 não tem redutor 50% (só redutor 0). prazo_restante = 55. Recalcula
-- parcelas (taxa_adm 18%). O migrate.js não semeia as cotas do 2128 nem toca o
-- prazo auto, então a alteração persiste.

UPDATE simulador_grupos SET prazo_restante = 55
WHERE numero_grupo = 2128 AND modalidade = 'auto';

UPDATE simulador_cotas sc SET cota = v.cota
FROM (VALUES
  (50000, 54865.83),
  (55000, 60352.41),
  (60000, 65839.00),
  (65000, 71325.58),
  (70000, 76812.16),
  (75000, 82298.75),
  (80000, 87785.33)
) AS v(bem, cota)
WHERE sc.numero_grupo = 2128 AND sc.modalidade = 'auto'
  AND sc.bem_referencia = v.bem;

-- Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 2128 AND sc.modalidade = 'auto'
  AND sc.redutor_parcela = 0 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
