-- Grupo 1043 (imóvel): prazo_restante atualizado para 140 meses.
-- migrate.js NÃO toca prazo_restante (persiste do banco), mas recalcula as parcelas
-- a cada boot a partir dele — então basta gravar o prazo aqui que as parcelas seguem.
-- Recalcula as parcelas já neste script (mesma fórmula do migrate) pra refletir na hora.

-- 1. Atualiza prazo_restante
UPDATE simulador_grupos
SET prazo_restante = 140
WHERE numero_grupo = 1043 AND modalidade = 'imovel';

-- 2. Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.numero_grupo = 1043
  AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0;

-- 3. Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.numero_grupo = 1043
  AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0;
