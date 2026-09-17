-- Set/2026: atualização de prazo_restante de grupos IMÓVEL (valores alvo informados).
-- migrate.js NÃO toca prazo_restante (persiste do banco) mas recalcula as parcelas
-- a cada boot a partir dele. Recalcula aqui também pra refletir na hora.
-- Respeita taxa por cota via COALESCE e pula cotas com parcela_fixa = TRUE.
-- O card lê sg.prazo_restante direto do banco, então já reflete o novo prazo.

-- 1. Atualiza prazo_restante
UPDATE simulador_grupos sg
SET prazo_restante = v.prazo
FROM (VALUES
  (1036,111),(1037,112),(1038,114),(1039,121),
  (1041,122),(1045,164),(1053,232),(1054,236)
) AS v(grupo, prazo)
WHERE sg.numero_grupo = v.grupo AND sg.modalidade = 'imovel';

-- 2. Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.modalidade = 'imovel'
  AND sg.numero_grupo IN (1036,1037,1038,1039,1041,1045,1053,1054)
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);

-- 3. Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.modalidade = 'imovel'
  AND sg.numero_grupo IN (1036,1037,1038,1039,1041,1045,1053,1054)
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
