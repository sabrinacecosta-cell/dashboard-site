-- Métricas (imóvel) — grupo 1044: adiciona Junho/2026 e Julho/2026.
-- Dados informados: 0 contemplados; ofertados (qnt_lances) 97 (jun) e 103 (jul);
-- lance_percent 76,5% (jun) e 76,0% (jul). contemplacao_mensal = contemplados/ofertados = 0.
--
-- Aplicado à mão na produção (as tabelas de contemplação de imóvel vêm de import
-- externo, não são semeadas pelo migrate.js). Idempotente: remove os dois meses
-- antes de inserir. As colunas de média ficam NULL, como nas demais linhas mensais.

DELETE FROM contemplacao
WHERE grupo = 1044 AND mes IN ('Junho/2026', 'Julho/2026');

INSERT INTO contemplacao
  (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal)
VALUES
  (1044, 'Junho/2026', 76.5, 97, 0, '0.000'),
  (1044, 'Julho/2026', 76.0, 103, 0, '0.000');

-- Recálculo das médias de contemplação incluindo Jun/Jul (método = soma(contemplados)
-- / soma(qnt_lances) na janela; validado contra os valores anteriores do grupo):
--   all-time  = 44/648 = 0.067901   (antes 0.114973, quando ia só até Abril/2026)
--   6 meses   =  8/422 = 0.018957   (Fev–Jul/2026)
--   12 meses  = 26/616 = 0.042208   (Ago/2025–Jul/2026)
-- A média fica numa única linha (a mais recente) porque o resumo usa MAX(...).
UPDATE contemplacao SET media_contemplacao = NULL, media_contemplacao_6m = NULL
WHERE grupo = 1044;
UPDATE contemplacao SET media_contemplacao = '0.0679', media_contemplacao_6m = '0.0190'
WHERE grupo = 1044 AND mes = 'Julho/2026';

UPDATE simulador_grupos
SET media_contemplacao = 0.067901, media_contemplacao_6m = 0.018957, media_contemplacao_12m = 0.042208
WHERE numero_grupo = 1044 AND modalidade = 'imovel';
