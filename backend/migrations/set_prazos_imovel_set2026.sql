-- Set/2026: atualização de prazo_restante de grupos imóvel (valores alvo informados).
-- migrate.js NÃO toca prazo_restante (persiste do banco) mas recalcula as parcelas
-- a cada boot a partir dele. Recalcula aqui também pra refletir na hora.
-- Grupos já nos valores alvo (1047=176, 1049=181, 41056=240) não entram.

-- 1. Atualiza prazo_restante
UPDATE simulador_grupos sg
SET prazo_restante = v.prazo
FROM (VALUES (1035,108),(1042,124),(1044,151),(1050,185),(1055,239)) AS v(grupo, prazo)
WHERE sg.numero_grupo = v.grupo AND sg.modalidade = 'imovel';

-- 2. Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.modalidade = 'imovel'
  AND sg.numero_grupo IN (1035,1042,1044,1050,1055)
  AND sg.prazo_restante > 0;

-- 3. Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.modalidade = 'imovel'
  AND sg.numero_grupo IN (1035,1042,1044,1050,1055)
  AND sg.prazo_restante > 0;
