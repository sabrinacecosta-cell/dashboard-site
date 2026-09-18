-- Set/2026: atualiza os valores de crédito (coluna `cota`) do grupo AUTO 2127.
-- 7 novos créditos por bem_referencia (50k..80k). O simulador exibe a coluna
-- `cota` como crédito; bem_referencia é a faixa/chave e permanece inalterada.
-- Atualiza redutor 0 e 0.5 (mesma cota). prazo_restante = 44. Recalcula parcelas
-- (redutor 0 = taxa_adm 15%; redutor 0.5 = taxa_adm_redutor 17%). O migrate.js
-- não semeia as cotas base do 2127 (só espelha 0->0.5) nem toca o prazo auto,
-- então a alteração persiste.

UPDATE simulador_grupos SET prazo_restante = 44
WHERE numero_grupo = 2127 AND modalidade = 'auto';

UPDATE simulador_cotas sc SET cota = v.cota
FROM (VALUES
  (50000, 56940.17),
  (55000, 62634.19),
  (60000, 68328.21),
  (65000, 74022.22),
  (70000, 79716.24),
  (75000, 85410.26),
  (80000, 91104.28)
) AS v(bem, cota)
WHERE sc.numero_grupo = 2127 AND sc.modalidade = 'auto'
  AND sc.bem_referencia = v.bem;

-- Recalcula parcelas sem redutor (taxa base)
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 2127 AND sc.modalidade = 'auto'
  AND sc.redutor_parcela = 0 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);

-- Recalcula parcelas com redutor 50% (taxa_adm_redutor)
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 2127 AND sc.modalidade = 'auto'
  AND sc.redutor_parcela = 0.5 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
