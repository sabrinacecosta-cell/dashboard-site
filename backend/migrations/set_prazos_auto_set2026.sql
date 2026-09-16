-- Set/2026: atualização de prazo_restante de grupos auto (valores alvo informados).
-- migrate.js NÃO toca prazo_restante (persiste do banco) mas recalcula as parcelas
-- a cada boot a partir dele. Recalcula aqui também pra refletir na hora.
-- 2134 já está em 100 (grupo cheio) — não entra. Respeita taxa por cota (2134)
-- via COALESCE e pula cotas com parcela_fixa = TRUE.

-- 1. Atualiza prazo_restante
UPDATE simulador_grupos sg
SET prazo_restante = v.prazo
FROM (VALUES (2127,44),(2130,63),(3002,76)) AS v(grupo, prazo)
WHERE sg.numero_grupo = v.grupo AND sg.modalidade = 'auto';

-- 2. Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.modalidade = 'auto'
  AND sg.numero_grupo IN (2127,2130,3002)
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
  AND sg.numero_grupo IN (2127,2130,3002)
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
