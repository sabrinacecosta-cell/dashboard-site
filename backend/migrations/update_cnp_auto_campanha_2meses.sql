-- Atualização mensal (auto CNP): passaram 2 meses. Além do decremento de prazo,
-- refaz a campanha vigente da modalidade auto:
--   • Grupos da campanha (2127, 2130, 2134, 3002): prazo e taxas fixos (absolutos).
--   • Demais grupos auto CNP: prazo_restante -2.
--   • Cria o grupo 2134 (novo) com cotas de 50 a 80 mil (de 10 em 10).
--   • Gera a opção "com redutor 50%" para o grupo 2127 (antes só sem redutor).
--
-- Taxas da campanha (sem redutor / com redutor 50%):
--   2127 → 15%  / 17%
--   2130 → 15%  / 17%
--   2134 → 11,5%/ 17%
--   3002 → 12%  / 17%
--
-- O filtro administradora = 'CNP' é obrigatório: os grupos Embracon (7026-7040)
-- dividem a tabela simulador_grupos e têm prazo/taxa próprios.
--
-- Valores de prazo dos grupos de campanha são ABSOLUTOS (não -2) para o resultado
-- independer do valor atual no banco e ser seguro contra reexecução.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Grupo 2134 (novo): cabeçalho. prazo_restante = prazo_total = 100 (grupo novo).
--    ON CONFLICT DO NOTHING para não reinserir se já existir.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO simulador_grupos
  (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
   reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
   sem_media_contemplacao)
VALUES
  (2134, 'auto', 'CNP', 0.115, 0.17, 0.03, 'INPC', 'SETEMBRO', 0.30, 100, 100, TRUE)
ON CONFLICT (numero_grupo, modalidade) DO NOTHING;

-- 2134: cotas de 50 a 80 mil (de 10 em 10), sem redutor (0) e com redutor 50% (0.5).
--       parcela = 0 provisória; recalculada no passo 6.
INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
VALUES
  (2134,'auto', 50000, 50000, 0, 0),
  (2134,'auto', 60000, 60000, 0, 0),
  (2134,'auto', 70000, 70000, 0, 0),
  (2134,'auto', 80000, 80000, 0, 0),
  (2134,'auto', 50000, 50000, 0, 0.5),
  (2134,'auto', 60000, 60000, 0, 0.5),
  (2134,'auto', 70000, 70000, 0, 0.5),
  (2134,'auto', 80000, 80000, 0, 0.5)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Grupo 2127: gera as cotas "com redutor 50%" espelhando as sem redutor.
--    parcela = 0 provisória; recalculada no passo 6.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
SELECT numero_grupo, modalidade, bem_referencia, cota, 0, 0.5
FROM simulador_cotas
WHERE numero_grupo = 2127 AND modalidade = 'auto' AND redutor_parcela = 0
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Taxas da campanha (autoritativo para os 4 grupos).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE simulador_grupos sg
SET taxa_adm = v.taxa_adm, taxa_adm_redutor = v.taxa_adm_redutor
FROM (VALUES
  (2127, 0.150, 0.17),
  (2130, 0.150, 0.17),
  (2134, 0.115, 0.17),
  (3002, 0.120, 0.17)
) AS v(numero_grupo, taxa_adm, taxa_adm_redutor)
WHERE sg.numero_grupo = v.numero_grupo
  AND sg.administradora = 'CNP'
  AND sg.modalidade = 'auto';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Prazos da campanha (absolutos).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE simulador_grupos sg
SET prazo_restante = v.prazo
FROM (VALUES
  (2127, 45),
  (2130, 64),
  (3002, 78)
) AS v(numero_grupo, prazo)
WHERE sg.numero_grupo = v.numero_grupo
  AND sg.administradora = 'CNP'
  AND sg.modalidade = 'auto';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Demais grupos auto CNP: prazo_restante -2 (exclui os 4 da campanha).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE simulador_grupos
SET prazo_restante = prazo_restante - 2
WHERE administradora = 'CNP'
  AND modalidade = 'auto'
  AND numero_grupo NOT IN (2127, 2130, 2134, 3002)
  AND prazo_restante > 2;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Recalcula parcelas de TODO o auto CNP com base no prazo_restante e taxas atuais.
-- ─────────────────────────────────────────────────────────────────────────────
-- 6a. Sem redutor (redutor_parcela = 0): usa taxa_adm.
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + sg.taxa_adm + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0
  AND sg.administradora = 'CNP'
  AND sg.modalidade = 'auto'
  AND sg.prazo_restante > 0;

-- 6b. Com redutor 50% (redutor_parcela = 0.5): usa taxa_adm_redutor (fallback taxa_adm).
UPDATE simulador_cotas sc
SET parcela = ROUND((sc.cota * (1 + COALESCE(sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
FROM simulador_grupos sg
WHERE sc.numero_grupo = sg.numero_grupo
  AND sc.modalidade = sg.modalidade
  AND sc.redutor_parcela = 0.5
  AND sg.administradora = 'CNP'
  AND sg.modalidade = 'auto'
  AND sg.prazo_restante > 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Conferência.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT numero_grupo, taxa_adm, taxa_adm_redutor, prazo_restante, prazo_total
FROM simulador_grupos
WHERE administradora = 'CNP' AND modalidade = 'auto'
ORDER BY numero_grupo;
