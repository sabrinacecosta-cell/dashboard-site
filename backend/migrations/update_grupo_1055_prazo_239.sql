-- Grupo 1055: prazo_restante 240 → 239 + recálculo de parcelas

-- 1. Atualiza prazo_restante
UPDATE simulador_grupos
SET prazo_restante = 239
WHERE numero_grupo = 1055 AND modalidade = 'imovel';

-- 2. Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.numero_grupo = 1055
  AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0;

-- 3. Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.numero_grupo = 1055
  AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0;
