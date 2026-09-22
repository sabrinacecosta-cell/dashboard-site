-- Set/2026: prazo_restante dos grupos AUTO (valores alvo informados).
-- migrate.js NÃO reescreve prazo_restante destes grupos (headers usam ON CONFLICT
-- DO NOTHING), mas recalcula as parcelas a cada boot a partir dele. Recalcula aqui
-- também pra refletir na hora. Respeita taxa por cota (COALESCE) e parcela_fixa.
-- 2134 permanece em 100 (grupo novo). 2125 e 5002 não estão na lista → intactos.

-- 1. Atualiza prazo_restante
UPDATE simulador_grupos sg
SET prazo_restante = v.prazo
FROM (VALUES
  (2126,30),(2127,44),(2128,55),(2129,60),
  (2130,63),(2132,68),(2133,72),(2134,100),(3002,76)
) AS v(grupo, prazo)
WHERE sg.numero_grupo = v.grupo AND sg.modalidade = 'auto';

-- 2. Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.modalidade = 'auto'
  AND sg.numero_grupo IN (2126,2127,2128,2129,2130,2132,2133,2134,3002)
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);

-- 3. Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.modalidade = 'auto'
  AND sg.numero_grupo IN (2126,2127,2128,2129,2130,2132,2133,2134,3002)
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
