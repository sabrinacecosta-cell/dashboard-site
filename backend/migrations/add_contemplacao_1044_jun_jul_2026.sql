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
