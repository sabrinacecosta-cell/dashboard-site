-- Set/2026: atualiza os valores de crédito (cotas) do grupo IMÓVEL 1050.
-- Novas 16 cartas (156.164,40 … 312.328,80). O grupo 1050 só existe em produção
-- (criado por migration .sql à mão); o migrate.js não semeia suas cotas, só
-- recalcula parcelas a cada boot. Premissas do grupo permanecem inalteradas:
-- taxa 15% / redutor 50% = 18%; fundo 3,7%; prazo_restante=185.
-- Autoritativo: apaga e reinsere as cotas (redutor 0 e 0.5) e recalcula parcelas.

DELETE FROM simulador_cotas WHERE numero_grupo = 1050 AND modalidade = 'imovel';

INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
SELECT 1050, 'imovel', c, c, 0, r
FROM (VALUES
  (156164.40), (166575.36), (176986.32), (187397.28),
  (197808.24), (208219.20), (218630.16), (229041.12),
  (239452.08), (249863.04), (260274.00), (270684.96),
  (281095.92), (291506.88), (301917.84), (312328.80)
) AS t(c)
CROSS JOIN (VALUES (0), (0.5)) AS red(r);

-- Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 1050 AND sc.modalidade = 'imovel'
  AND sc.redutor_parcela = 0 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);

-- Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 1050 AND sc.modalidade = 'imovel'
  AND sc.redutor_parcela = 0.5 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
