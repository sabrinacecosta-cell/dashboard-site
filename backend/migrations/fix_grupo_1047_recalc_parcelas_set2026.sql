-- Set/2026: grupo 1047 (imóvel, plano único 10%) passa a ter parcela calculada pela
-- fórmula (não mais tabela curada "com desconto"). prazo_restante já está em 175;
-- as parcelas estavam presas nos valores de prazo 176. Recalcula com base em 175,
-- mantendo taxa adm (10%) e fundo de reserva (3,7%). parcela_fixa vira FALSE para o
-- recálculo automático passar a valer no boot e nos próximos meses.
-- (migrate.js atualizado no mesmo commit: cotas do 1047 inseridas com parcela_fixa=FALSE.)

-- Libera o recálculo automático nas cotas do 1047
UPDATE simulador_cotas SET parcela_fixa = FALSE
WHERE numero_grupo = 1047 AND modalidade = 'imovel';

-- Recalcula parcelas sem redutor (1047 só tem redutor 0), taxa por cota via COALESCE
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.numero_grupo = 1047 AND sg.modalidade = 'imovel'
  AND sg.prazo_restante > 0;
