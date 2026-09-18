-- Set/2026: atualiza os valores de crédito (cotas) do grupo IMÓVEL 1051.
-- Novas 16 cartas (156.147,00 … 312.300,40). Aplicação imediata em produção;
-- o migrate.js também foi atualizado (bloco do 1051) para semear estes mesmos
-- valores nos próximos boots. Premissas do grupo permanecem inalteradas:
-- taxa 20%; fundo 3,7%; prazo_restante=228. 1051 não está em campanha de
-- redutor 50% (as cotas 0.5 são removidas na limpeza do migrate.js), então só
-- há parcela sem redutor.
-- Autoritativo: apaga e reinsere as cotas e recalcula parcelas.

DELETE FROM simulador_cotas WHERE numero_grupo = 1051 AND modalidade = 'imovel';

INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
SELECT 1051, 'imovel', c, c, 0, 0
FROM (VALUES
  (156147.00), (166556.80), (176966.60), (187376.40),
  (197786.20), (208196.00), (218605.80), (229015.60),
  (239425.40), (249835.20), (260245.00), (270654.80),
  (281064.60), (291474.40), (301884.20), (312300.40)
) AS t(c);

-- Recalcula parcelas sem redutor
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo AND sc.modalidade = sg.modalidade
  AND sc.numero_grupo = 1051 AND sc.modalidade = 'imovel'
  AND sc.redutor_parcela = 0 AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
