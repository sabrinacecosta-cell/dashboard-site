-- Julho/2026: correção dos prazos restantes dos grupos CNP de imóvel para os
-- valores reais informados. Valores absolutos (não -1) para o resultado
-- independer do valor atual no banco. O 1055 segue fixo em 240 (não decrementa).
--
-- O filtro administradora = 'CNP' é obrigatório: os grupos Embracon (7026-7040)
-- dividem a tabela simulador_grupos, têm prazo próprio e são reescritos pelo
-- migrate.js a cada boot.

-- 1. Fixa prazo_restante por grupo (valores absolutos)
UPDATE simulador_grupos sg
SET prazo_restante = v.prazo
FROM (VALUES
  (1035, 109),
  (1038, 115),
  (1042, 125),
  (1043, 141),
  (1044, 152),
  (1051, 229),
  (1054, 237),
  (1055, 240)
) AS v(numero_grupo, prazo)
WHERE sg.numero_grupo = v.numero_grupo
  AND sg.administradora = 'CNP'
  AND sg.modalidade = 'imovel';

-- 2. Recalcula parcelas sem redutor com base no novo prazo_restante
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.administradora = 'CNP'
  AND sg.modalidade = 'imovel'
  AND sg.numero_grupo IN (1035, 1038, 1042, 1043, 1044, 1051, 1054, 1055)
  AND sg.prazo_restante > 0;

-- 3. Recalcula parcelas com redutor 50% com base no novo prazo_restante
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.administradora = 'CNP'
  AND sg.modalidade = 'imovel'
  AND sg.numero_grupo IN (1035, 1038, 1042, 1043, 1044, 1051, 1054, 1055)
  AND sg.prazo_restante > 0;

-- 4. Conferência: prazo_restante por grupo após a correção
SELECT numero_grupo, prazo_restante
FROM simulador_grupos
WHERE administradora = 'CNP'
  AND modalidade = 'imovel'
  AND numero_grupo IN (1035, 1038, 1042, 1043, 1044, 1051, 1054, 1055)
ORDER BY numero_grupo;
