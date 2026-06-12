-- Junho/2026: passou 1 mês, todos os grupos de imóvel diminuem 1 no prazo_restante.
-- O grupo 1055 já foi decrementado (240 -> 239) na migration update_grupo_1055_prazo_239.sql,
-- por isso fica de fora do -1 geral aqui.

-- 1. Decrementa prazo_restante de todos os grupos de imóvel (exceto 1055, já feito)
UPDATE simulador_grupos
SET prazo_restante = prazo_restante - 1
WHERE modalidade = 'imovel'
  AND numero_grupo <> 1055
  AND prazo_restante > 0;

-- 2. Recalcula parcelas sem redutor com base no novo prazo_restante
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0;

-- 3. Recalcula parcelas com redutor 50% com base no novo prazo_restante
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0;
