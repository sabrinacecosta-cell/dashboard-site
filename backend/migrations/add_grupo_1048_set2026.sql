-- Set/2026: cria o grupo IMÓVEL 1048 (condição especial setembro).
-- Espelha o padrão do 1049: taxa 15% / redutor 50% = 18%; fundo 3,7%;
-- lance embutido máx 30%; prazo_restante=180 / total=200; reajuste INPC/JANEIRO.
-- Autoritativo: apaga e redefine grupo + cotas. Também recalcula as parcelas
-- (o migrate.js recalcula a cada boot, mas aqui reflete na hora).

DELETE FROM simulador_cotas WHERE numero_grupo = 1048 AND modalidade = 'imovel';
DELETE FROM simulador_grupos WHERE numero_grupo = 1048 AND modalidade = 'imovel';

INSERT INTO simulador_grupos
  (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
   reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
   sem_media_contemplacao, decrementa_prazo)
VALUES
  (1048, 'imovel', 'CNP', 0.15, 0.18, 0.037, 'INPC', 'JANEIRO', 0.30, 180, 200, TRUE, TRUE);

INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
SELECT 1048, 'imovel', c, c, 0, r
FROM (VALUES
  (156266.70), (166684.48), (177102.26), (187520.04),
  (197937.82), (208355.60), (218773.38), (229191.16),
  (239608.94), (250026.72), (260444.50), (270862.28),
  (281280.06), (291697.84), (302115.62), (312533.40)
) AS t(c)
CROSS JOIN (VALUES (0), (0.5)) AS red(r);

-- Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 1048 AND sc.modalidade = 'imovel'
  AND sc.redutor_parcela = 0 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);

-- Recalcula parcelas com redutor 50%
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 1048 AND sc.modalidade = 'imovel'
  AND sc.redutor_parcela = 0.5 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
