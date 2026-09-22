-- Set/2026: passou 1 mês, os grupos de imóvel diminuem 1 no prazo_restante.
-- Exceção pedida: o grupo 41056 (novo, começa cheio) fica de fora.
-- Já ficam de fora naturalmente:
--   - 1055: prazo fixo em 240 (decrementa_prazo = FALSE).
--   - Embracon (7026..7040): prazo próprio reescrito pelo migrate.js a cada boot.
-- Espelha a rota PUT /admin/grupos/prazo/decrement, mas restrito a imóvel e
-- excluindo o 41056. Recalcula parcelas (respeita taxa por cota e parcela_fixa),
-- que é o que alimenta o valor exibido no card do simulador.
--
-- ATENÇÃO: migrate.js reescreve prazo_restante de 1048 (agora 179) e 1049 (agora
-- 180) a cada boot — os valores hardcoded foram atualizados junto neste commit.

-- 1. Decrementa prazo_restante dos grupos de imóvel CNP (exceto 1055 e 41056)
UPDATE simulador_grupos
SET prazo_restante = prazo_restante - 1
WHERE modalidade = 'imovel'
  AND administradora = 'CNP'
  AND decrementa_prazo
  AND numero_grupo <> 41056
  AND prazo_restante > 0;

-- 2. Recalcula parcelas sem redutor com base no novo prazo_restante
--    (taxa por cota via COALESCE; pula cotas com parcela_fixa = TRUE)
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.modalidade = 'imovel'
  AND sg.administradora = 'CNP'
  AND sg.numero_grupo <> 41056
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);

-- 3. Recalcula parcelas com redutor 50% com base no novo prazo_restante
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.modalidade = 'imovel'
  AND sg.administradora = 'CNP'
  AND sg.numero_grupo <> 41056
  AND sg.prazo_restante > 0
  AND NOT COALESCE(sc.parcela_fixa, FALSE);
