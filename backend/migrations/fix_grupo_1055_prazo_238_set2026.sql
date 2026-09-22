-- Set/2026: correção — o grupo 1055 (imóvel) também entra no -1 do mês: 239 -> 238.
-- Antes estava com decrementa_prazo = FALSE (prazo tratado como fixo). A partir de
-- agora o 1055 decrementa como os demais: flag vira TRUE (migrate.js atualizado no
-- mesmo commit para não forçar FALSE no boot). Recalcula parcelas (taxa/fundo iguais).

UPDATE simulador_grupos
SET prazo_restante = 238, decrementa_prazo = TRUE
WHERE numero_grupo = 1055 AND modalidade = 'imovel';

-- Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.numero_grupo = 1055 AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);

-- Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.numero_grupo = 1055 AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
