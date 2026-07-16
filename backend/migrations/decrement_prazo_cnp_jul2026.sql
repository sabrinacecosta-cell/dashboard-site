-- Julho/2026: passou 1 mês, os grupos CNP de imóvel e automóvel diminuem 1 no
-- prazo_restante. O grupo 1055 fica de fora (prazo_restante permanece como está).
--
-- O filtro administradora = 'CNP' é obrigatório: desde a entrada da Embracon os
-- grupos 7026-7040 dividem a tabela simulador_grupos, têm prazo próprio e são
-- reescritos pelo migrate.js a cada boot.

-- 1. Decrementa prazo_restante dos grupos CNP de imóvel e auto (exceto 1055)
UPDATE simulador_grupos
SET prazo_restante = prazo_restante - 1
WHERE administradora = 'CNP'
  AND modalidade IN ('imovel', 'auto')
  AND numero_grupo <> 1055
  AND prazo_restante > 0;

-- 2. Recalcula parcelas sem redutor com base no novo prazo_restante
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.administradora = 'CNP'
  AND sg.modalidade IN ('imovel', 'auto')
  AND sg.numero_grupo <> 1055
  AND sg.prazo_restante > 0;

-- 3. Recalcula parcelas com redutor 50% com base no novo prazo_restante
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.administradora = 'CNP'
  AND sg.modalidade IN ('imovel', 'auto')
  AND sg.numero_grupo <> 1055
  AND sg.prazo_restante > 0;

-- 4. Conferência: prazo_restante por grupo após o -1 (1055 deve ficar inalterado)
SELECT modalidade, numero_grupo, prazo_restante
FROM simulador_grupos
WHERE administradora = 'CNP' AND modalidade IN ('imovel', 'auto')
ORDER BY modalidade, numero_grupo;
