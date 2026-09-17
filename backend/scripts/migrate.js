require('dotenv').config();
const db = require('../src/config/database');
const seedProducao = require('./seed_producao');

async function migrate() {
  console.log('Iniciando migração PostgreSQL...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Tabela "usuarios" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS producao (
      id SERIAL PRIMARY KEY,
      mes INTEGER,
      cliente TEXT,
      valor_do_bem DECIMAL(15,2),
      assessor TEXT,
      email_assessor TEXT,
      escritorio TEXT,
      ano INTEGER
    )
  `);
  console.log('Tabela "producao" OK!');

  // Tabela contemplacao (Imóvel - Planilha2)
  await db.query(`
    CREATE TABLE IF NOT EXISTS contemplacao (
      id SERIAL PRIMARY KEY,
      grupo INTEGER,
      mes TEXT,
      lance_percent DECIMAL(5,1),
      qnt_lances INTEGER,
      contemplados INTEGER,
      contemplacao_mensal TEXT,
      media_contemplacao TEXT,
      media_lance_percent DECIMAL(5,1)
    )
  `);
  console.log('Tabela "contemplacao" OK!');

  // Coluna da média de 6 meses (imóvel). Vinha só das migrations manuais na produção;
  // aqui garante que exista para o recálculo automático 6m/12m mais abaixo.
  await db.query(`ALTER TABLE contemplacao ADD COLUMN IF NOT EXISTS media_contemplacao_6m TEXT`);

  // Tabela contemplacao_auto (Auto - Planilha3)
  await db.query(`
    CREATE TABLE IF NOT EXISTS contemplacao_auto (
      id SERIAL PRIMARY KEY,
      grupo INTEGER,
      mes TEXT,
      lance_percent DECIMAL(5,1),
      qnt_lances INTEGER,
      contemplados INTEGER,
      contemplacao_mensal TEXT,
      media_contemplacao TEXT,
      media_lance_percent DECIMAL(5,1)
    )
  `);
  console.log('Tabela "contemplacao_auto" OK!');

  // Novas colunas para producao (janeiro/2026+)
  const novasColunas = [
    { nome: 'modalidade', tipo: 'TEXT' },
    { nome: 'grupo', tipo: 'TEXT' },
    { nome: 'cota', tipo: 'INTEGER' },
    { nome: 'parcela', tipo: 'DECIMAL(15,2)' },
    { nome: 'natureza_sujeito', tipo: 'TEXT' },
    { nome: 'uf', tipo: 'TEXT' },
    { nome: 'tipo_produto', tipo: 'TEXT' },
    { nome: 'taxa_adm', tipo: 'DECIMAL(5,2)' },
    { nome: 'administradora', tipo: 'TEXT' }
  ];

  for (const col of novasColunas) {
    await db.query(`
      DO $$ 
      BEGIN 
        ALTER TABLE producao ADD COLUMN ${col.nome} ${col.tipo};
      EXCEPTION 
        WHEN duplicate_column THEN NULL;
      END $$;
    `);
  }
  console.log('Novas colunas em "producao" OK!');

  // Tabelas do Simulador
  await db.query(`
    CREATE TABLE IF NOT EXISTS simulador_grupos (
      id SERIAL PRIMARY KEY,
      numero_grupo INTEGER NOT NULL,
      modalidade TEXT NOT NULL,
      taxa_adm DECIMAL(5,4) NOT NULL,
      fundo_reserva DECIMAL(5,4) NOT NULL,
      reajuste TEXT NOT NULL,
      mes_reajuste TEXT NOT NULL,
      lance_embutido_max DECIMAL(5,2) NOT NULL,
      prazo_restante INTEGER NOT NULL,
      prazo_total INTEGER NOT NULL,
      media_contemplacao DECIMAL(10,6),
      sem_media_contemplacao BOOLEAN DEFAULT FALSE
    )
  `);
  console.log('Tabela "simulador_grupos" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS simulador_cotas (
      id SERIAL PRIMARY KEY,
      numero_grupo INTEGER NOT NULL,
      modalidade TEXT NOT NULL,
      bem_referencia DECIMAL(15,2) NOT NULL,
      cota INTEGER NOT NULL,
      parcela DECIMAL(15,2) NOT NULL,
      redutor_parcela DECIMAL(5,2) NOT NULL DEFAULT 0
    )
  `);
  console.log('Tabela "simulador_cotas" OK!');

  // taxa_adm por cota: override opcional da taxa do grupo. NULL = usa a taxa do
  // grupo (comportamento padrão de todas as cotas). Não-nulo = a cota tem uma taxa
  // própria — permite, no mesmo grupo, uma "opção" com taxa diferente (ex.: grupo
  // 2134 com plano 11,5% e plano 6%). Entra na chave única via COALESCE (abaixo).
  await db.query(`ALTER TABLE simulador_cotas ADD COLUMN IF NOT EXISTS taxa_adm DECIMAL(5,4)`);
  console.log('Coluna "simulador_cotas.taxa_adm" OK!');

  // parcela_fixa: quando TRUE, a parcela é curada (ex.: tabela promocional da área
  // comercial) e o recálculo automático de parcelas NÃO a sobrescreve. Default FALSE
  // = parcela derivada da fórmula (cota, taxa, fundo, prazo do grupo).
  await db.query(`ALTER TABLE simulador_cotas ADD COLUMN IF NOT EXISTS parcela_fixa BOOLEAN DEFAULT FALSE`);
  console.log('Coluna "simulador_cotas.parcela_fixa" OK!');

  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS lance_maximo_contemplado DECIMAL(5,2)`);
  console.log('Coluna "lance_maximo_contemplado" OK!');

  // Corrigir media_contemplacao e popular lance_maximo_contemplado para grupos imóvel
  const patchesImovel = [
    [1035, 0.048814, 56],
    [1036, 0.129100, 57],
    [1037, 0.083019, 58],
    [1038, 0.067657, 59],
    [1039, 0.066552, 61.5],
    [1040, 0.141658, 62],
    [1041, 0.057915, 63],
    [1042, 0.091165, 64],
    [1043, 0.167906, 72],
    [1044, 0.042208, 77.5],
    [1045, 0.447368, 84],
    [1047, 0.272727, null],
    [1053, 0.323529, null],
  ];
  for (const [grupo, media, lanceMax] of patchesImovel) {
    await db.query(
      `UPDATE simulador_grupos
         SET media_contemplacao = $1, lance_maximo_contemplado = $2, sem_media_contemplacao = FALSE
       WHERE numero_grupo = $3 AND modalidade = 'imovel'`,
      [media, lanceMax, grupo]
    );
  }
  console.log('Patches de media_contemplacao e lance_maximo_contemplado aplicados!');

  // Novo mês do grupo 1053 (imóvel): julho/2026 — 0 contemplados em 37 lances.
  // Idempotente por mês. media_contemplacao fica NULL: o bloco dos 12 meses abaixo
  // recalcula a média do grupo já incluindo este mês.
  // Obs.: lance_percent é DECIMAL(5,1) → 77,99% é gravado como 78,0 (padrão dos demais grupos).
  await db.query(`
    INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT 1053, 'maio/2026', 78, 16, 6, '0.375', NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao WHERE grupo = 1053 AND LOWER(mes) = 'maio/2026'
    )
  `);
  await db.query(`
    INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT 1053, 'junho/2026', 77.99, 51, 0, '0', NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao WHERE grupo = 1053 AND LOWER(mes) = 'junho/2026'
    )
  `);
  await db.query(`
    INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT 1053, 'julho/2026', 77.99, 37, 0, '0', NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao WHERE grupo = 1053 AND LOWER(mes) = 'julho/2026'
    )
  `);
  console.log('Contemplação 1053 maio+junho+julho/2026 OK (idempotente)!');

  // Novo mês do grupo 1038 (imóvel): agosto/2026 — 22 contemplados em 543 lances,
  // lance vencedor 57%. Idempotente por mês. media_contemplacao fica NULL: o bloco
  // dos 12 meses abaixo recalcula a média do grupo já incluindo este mês.
  await db.query(`
    INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT 1038, 'agosto/2026', 57, 543, 22, '0.040516', NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao WHERE grupo = 1038 AND LOWER(mes) = 'agosto/2026'
    )
  `);
  console.log('Contemplação 1038 agosto/2026 OK (idempotente)!');

  // Novo mês do grupo 1040 (imóvel): agosto/2026 — 17 contemplados em 125 lances,
  // lance vencedor 60%. Idempotente por mês. media_contemplacao fica NULL: o bloco
  // dos 12 meses abaixo recalcula a média do grupo já incluindo este mês.
  await db.query(`
    INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT 1040, 'agosto/2026', 60, 125, 17, '0.136000', NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao WHERE grupo = 1040 AND LOWER(mes) = 'agosto/2026'
    )
  `);
  console.log('Contemplação 1040 agosto/2026 OK (idempotente)!');

  // Novo mês do grupo 1042 (imóvel): agosto/2026 — 19 contemplados em 411 lances,
  // lance vencedor 62%. Idempotente por mês. media_contemplacao fica NULL: o bloco
  // dos 12 meses abaixo recalcula a média do grupo já incluindo este mês.
  await db.query(`
    INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT 1042, 'agosto/2026', 62, 411, 19, '0.046229', NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao WHERE grupo = 1042 AND LOWER(mes) = 'agosto/2026'
    )
  `);
  console.log('Contemplação 1042 agosto/2026 OK (idempotente)!');

  // Novo mês do grupo 1043 (imóvel): agosto/2026 — 13 contemplados em 142 lances,
  // lance vencedor 70%. Idempotente por mês. media_contemplacao fica NULL: o bloco
  // dos 12 meses abaixo recalcula a média do grupo já incluindo este mês.
  await db.query(`
    INSERT INTO contemplacao (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT 1043, 'agosto/2026', 70, 142, 13, '0.091549', NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao WHERE grupo = 1043 AND LOWER(mes) = 'agosto/2026'
    )
  `);
  console.log('Contemplação 1043 agosto/2026 OK (idempotente)!');

  // ── Médias de contemplação (imóvel) = ÚLTIMOS 12 E 6 MESES ───────────────────
  // O resumo de Métricas exibe "média de 12 meses" e "média de 6 meses"; o card do
  // Simulador exibe a de 12 meses (lida viva via MAX(media_contemplacao)). Este bloco
  // calcula soma(contemplados)/soma(qnt_lances) das janelas de 12 e 6 meses mais
  // recentes por grupo (fonte: tabela contemplacao, importada à parte) e substitui o
  // valor curado/all-time do patchesImovel acima. Autossuficiente: recalcula a cada
  // boot e acompanha todo mês novo importado — por isso, subir um mês novo já atualiza
  // sozinho as médias 6m/12m (Métricas) e o valor exibido no card do Simulador.
  // Grava em simulador_grupos (Multiplicador + colunas 12m/6m) e na própria contemplacao
  // (resumo/card usam MAX(...) dela, gravada só na linha mais recente do grupo).
  // AUTO NÃO entra: a média de auto é curada — a contemplacao_auto não guarda os
  // ofertados de forma comparável e um SUM/SUM bruto dá valores errados.
  {
    const ORD_MES = `CASE
        WHEN mes NOT LIKE '%/%' THEN
          CASE LOWER(mes)
            WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
            WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
            WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
            WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
            ELSE 99 END
        ELSE
          (CAST(SPLIT_PART(mes,'/',2) AS INTEGER) - 2024) * 12 +
          CASE LOWER(SPLIT_PART(mes,'/',1))
            WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
            WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
            WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
            WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
            ELSE 0 END + 100
        END`;
    // Média SUM/SUM dos N meses mais recentes por grupo.
    const mediaN = (n) => `
      WITH ranked AS (
        SELECT grupo, contemplados, qnt_lances,
               ROW_NUMBER() OVER (PARTITION BY grupo ORDER BY ${ORD_MES} DESC) rn
        FROM contemplacao
      ),
      agg AS (
        SELECT grupo, SUM(contemplados)::numeric sc, SUM(qnt_lances)::numeric sq
        FROM ranked WHERE rn <= ${n} GROUP BY grupo
      )
      SELECT grupo, ROUND(sc / sq, 6) media FROM agg WHERE sq > 0`;
    const MEDIA12 = mediaN(12);
    const MEDIA6 = mediaN(6);
    const LATEST = `
      SELECT id, grupo FROM (
        SELECT id, grupo, ROW_NUMBER() OVER (PARTITION BY grupo ORDER BY ${ORD_MES} DESC) rn
        FROM contemplacao
      ) x WHERE rn = 1`;

    // simulador_grupos: media_contemplacao (principal = 12m, lida pelo card e Multiplicador)
    // + colunas dedicadas 12m/6m.
    await db.query(`
      UPDATE simulador_grupos sg
         SET media_contemplacao = m.media, media_contemplacao_12m = m.media
      FROM (${MEDIA12}) m
      WHERE sg.numero_grupo = m.grupo AND sg.modalidade = 'imovel' AND sg.administradora = 'CNP'`);
    await db.query(`
      UPDATE simulador_grupos sg SET media_contemplacao_6m = m.media
      FROM (${MEDIA6}) m
      WHERE sg.numero_grupo = m.grupo AND sg.modalidade = 'imovel' AND sg.administradora = 'CNP'`);

    // contemplacao: cada média fica numa única linha por grupo (a mais recente) — resumo usa MAX.
    await db.query(`UPDATE contemplacao SET media_contemplacao = NULL, media_contemplacao_6m = NULL`);
    await db.query(`
      WITH latest AS (${LATEST}), m AS (${MEDIA12})
      UPDATE contemplacao c SET media_contemplacao = m.media
      FROM latest l, m WHERE c.id = l.id AND l.grupo = m.grupo`);
    await db.query(`
      WITH latest AS (${LATEST}), m AS (${MEDIA6})
      UPDATE contemplacao c SET media_contemplacao_6m = m.media
      FROM latest l, m WHERE c.id = l.id AND l.grupo = m.grupo`);
    console.log('Médias de contemplação 12m e 6m (imóvel) recalculadas!');
  }

  // Popular lance_maximo_contemplado para grupos auto
  const patchesAuto = [
    [2125, 31.25],
    [2126, 43.75],
    [2127, 61.25],
    [2128, 61],
    [2132, null],
    [2133, null],
  ];
  for (const [grupo, lanceMax] of patchesAuto) {
    await db.query(
      `UPDATE simulador_grupos SET lance_maximo_contemplado = $1 WHERE numero_grupo = $2 AND modalidade = 'auto'`,
      [lanceMax, grupo]
    );
  }
  console.log('Patches lance_maximo_contemplado auto aplicados!');

  // taxa_adm_redutor: taxa administrativa específica quando "com redutor 50%" está selecionado.
  // NULL = usar taxa_adm para ambas as opções de parcela.
  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS taxa_adm_redutor DECIMAL(5,4)`);

  // Imóvel: taxa_adm_redutor (campanha redutor 50%). Reseta e redefine — autoritativo.
  await db.query(`UPDATE simulador_grupos SET taxa_adm_redutor = NULL WHERE modalidade = 'imovel'`);
  // Redutor 50% ativo APENAS nos grupos em campanha vigente. Os demais não
  // oferecem a opção (as cotas 0.5 deles são removidas no bloco de limpeza mais
  // abaixo, depois de todas as inserções). O grupo novo 41056 define seu próprio
  // taxa_adm_redutor no INSERT (é criado depois desta seção).
  // Imóvel: 19% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.19
    WHERE modalidade = 'imovel' AND numero_grupo IN (1035, 1042, 1043, 1044)
  `);
  // Imóvel: 18% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.18
    WHERE modalidade = 'imovel' AND numero_grupo IN (1048, 1049, 1050, 1055)
  `);
  // Auto: campanha (2127, 2130, 2134, 3002) → 17% com redutor
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm_redutor = 0.17
    WHERE modalidade = 'auto' AND numero_grupo IN (2127, 2130, 2134, 3002)
  `);
  console.log('Coluna taxa_adm_redutor e valores OK!');

  // Imóvel: taxa_adm base (sem redutor) — autoritativo p/ os grupos da campanha julho.
  // Campanha julho: sem redutor 20% nestes grupos.
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm = 0.20
    WHERE modalidade = 'imovel' AND numero_grupo IN (1035, 1038, 1042, 1043, 1044, 1051, 1054)
  `);
  // Condição especial setembro: sem redutor 15% (1049 e 41056 já saem 15% dos
  // próprios INSERTs). Autoritativo — cobre também 1048/1050/1055, que só existem
  // em produção (criados por migrations .sql aplicadas à mão).
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm = 0.15
    WHERE modalidade = 'imovel' AND numero_grupo IN (1048, 1050, 1055)
  `);
  // Imóvel: grupo 1040 — taxa administrativa corrigida para 17% (autoritativo).
  await db.query(`
    UPDATE simulador_grupos SET taxa_adm = 0.17
    WHERE modalidade = 'imovel' AND numero_grupo = 1040
  `);
  console.log('taxa_adm base (campanha julho) OK!');

  await db.query(`CREATE INDEX IF NOT EXISTS idx_sim_grupos_modalidade ON simulador_grupos(modalidade)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sim_cotas_grupo ON simulador_cotas(numero_grupo, modalidade)`);
  console.log('Índices simulador OK!');

  // Deduplica cotas idênticas (mesmo grupo/modalidade/bem/cota/redutor/taxa), mantendo
  // o menor id, e cria índice único para impedir re-duplicação. Necessário porque o
  // INSERT do grupo 2129 usa ON CONFLICT DO NOTHING (sem este índice, reinseria a
  // cada boot). A coluna `cota` faz parte da chave porque há grupos (ex.: 1037) com
  // cotas distintas para o mesmo bem_referencia — que devem ser preservadas.
  // COALESCE(taxa_adm, -1): a taxa por cota entra na chave, e cotas com taxa própria
  // (ex.: plano 6% do 2134) coexistem com as de mesmo bem/cota/redutor sem taxa
  // (plano padrão). -1 é sentinela impossível para NULL — dois NULLs colidem (dedup),
  // mas NULL e 0,06 não. O índice antigo (sem taxa) é substituído por este.
  await db.query(`DROP INDEX IF EXISTS uq_sim_cotas_natural`);
  await db.query(`
    DELETE FROM simulador_cotas a USING simulador_cotas b
    WHERE a.id > b.id
      AND a.numero_grupo = b.numero_grupo
      AND a.modalidade = b.modalidade
      AND a.bem_referencia = b.bem_referencia
      AND a.cota = b.cota
      AND a.redutor_parcela = b.redutor_parcela
      AND COALESCE(a.taxa_adm, -1) = COALESCE(b.taxa_adm, -1)
  `);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_cotas_natural
    ON simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, redutor_parcela, (COALESCE(taxa_adm, -1)))`);
  console.log('Cotas deduplicadas e índice único uq_sim_cotas_natural OK!');

  // Índices para busca por assessor
  await db.query(`CREATE INDEX IF NOT EXISTS idx_producao_assessor ON producao(assessor)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_producao_email ON producao(email_assessor)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_contemplacao_grupo ON contemplacao(grupo)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_contemplacao_auto_grupo ON contemplacao_auto(grupo)`);
  console.log('Índices OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS acompanhamento (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_nome VARCHAR(200) NOT NULL,
      cliente_cpf VARCHAR(20),
      grupo VARCHAR(20),
      cota VARCHAR(20),
      contrato VARCHAR(20),
      data_venda VARCHAR(20),
      prazo_grupo INTEGER,
      taxa_adm VARCHAR(20),
      proximo_reajuste VARCHAR(20),
      parcelas_pagas INTEGER,
      soma_parcelas_pagas DECIMAL(12,2),
      prazo_restante INTEGER,
      saldo_devedor DECIMAL(12,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Tabela "acompanhamento" OK!');

  await db.query(`ALTER TABLE acompanhamento ADD COLUMN IF NOT EXISTS valor_do_bem DECIMAL(12,2)`);
  console.log('Coluna "valor_do_bem" em acompanhamento OK!');

  // Seed inicial — só insere se a tabela estiver vazia
  const { rows: countRows } = await db.query('SELECT COUNT(*) FROM acompanhamento');
  if (parseInt(countRows[0].count) === 0) {
    const seedData = [
      // Marcelo Rodrigo Weckerlin
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001002','0069-00','103818','14/07/2025',150,'18,50%','01/02/2027',10,6202.23,140,178312.64],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001002','0414-00','103816','14/07/2025',150,'18,50%','01/02/2027',10,6202.23,140,178312.64],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001002','0468-00','103817','14/07/2025',150,'18,50%','01/02/2027',10,6202.23,140,178312.64],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0016-00','103525','10/06/2025',150,'12,50%','09/06/2026',11,11550.00,139,145950.05],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0027-00','103524','10/06/2025',150,'12,50%','09/06/2026',11,9900.00,139,125100.05],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0087-00','103820','14/07/2025',150,'18,50%','11/07/2026',10,5170.10,140,148879.95],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0126-00','103523','10/06/2025',150,'12,50%','09/06/2026',11,9900.00,139,125100.05],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0218-00','103815','14/07/2025',150,'18,50%','11/07/2026',10,5965.50,140,171784.56],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0235-00','103819','14/07/2025',150,'18,50%','11/07/2026',10,4772.40,140,137427.65],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0264-00','103814','14/07/2025',150,'18,50%','11/07/2026',10,5965.50,140,171784.56],
      ['Marcelo Rodrigo Weckerlin','027.140.749-28','001003','0330-00','103522','10/06/2025',150,'12,50%','09/06/2026',11,9900.00,139,125100.05],
      // Alex Martins Calcina
      ['Alex Martins Calcina','100.349.078-66','001001','0029','102130','25/11/2024',150,'18,50%','01/11/2026',18,10846.32,132,175606.40],
      ['Alex Martins Calcina','100.349.078-66','001001','0253','102133','25/11/2024',150,'18,50%','01/11/2026',16,9619.48,132,176833.20],
      ['Alex Martins Calcina','100.349.078-66','001001','0280','102135','25/11/2024',150,'18,50%','01/11/2026',16,8336.88,132,153255.44],
      ['Alex Martins Calcina','100.349.078-66','001001','0303','102136','25/11/2024',150,'18,50%','01/11/2026',18,15192.15,132,133384.54],
      ['Alex Martins Calcina','100.349.078-66','001001','0430','102134','25/11/2024',150,'18,50%','01/11/2026',18,10846.32,132,175606.40],
      ['Alex Martins Calcina','100.349.078-66','001001','0487','102132','25/11/2024',150,'18,50%','01/11/2026',18,10846.32,132,175606.40],
      // Stefan Wolansky Negrao
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0026','102076','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0081','102084','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0090','102079','22/11/2024',150,'18,50%','01/11/2026',18,22985.21,132,163504.01],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0124','102087','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0138','102077','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0193','102074','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0201','102078','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0218','102085','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0234','102080','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0242','102088','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0244','102086','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0269','102082','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0310','102090','22/11/2024',150,'18,50%','01/11/2026',18,8706.34,132,140485.11],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0321','102075','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0344','102081','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0435','102089','22/11/2024',150,'18,50%','01/11/2026',18,9431.83,132,152192.22],
      ['Stefan Wolansky Negrao','164.607.068-24','001001','0479','102083','22/11/2024',150,'18,50%','01/11/2026',18,10882.90,132,175606.40],
      ['Stefan Wolansky Negrao','164.607.068-24','001002','0018','102279','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12],
      ['Stefan Wolansky Negrao','164.607.068-24','001002','0068','102272','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12],
      ['Stefan Wolansky Negrao','164.607.068-24','001002','0141','102281','06/12/2024',150,'18,50%','01/02/2027',15,7783.69,135,152055.05],
    ];
    for (const row of seedData) {
      await db.query(
        `INSERT INTO acompanhamento
          (cliente_nome,cliente_cpf,grupo,cota,contrato,data_venda,prazo_grupo,taxa_adm,
           proximo_reajuste,parcelas_pagas,soma_parcelas_pagas,prazo_restante,saldo_devedor)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        row
      );
    }
    console.log(`Seed "acompanhamento": ${seedData.length} registros inseridos!`);
  }

  // Cotas adicionais do Stefan Wolansky Negrao (grupos 001002 e 001003) —
  // extraídas dos extratos e conciliadas com as colunas. Idempotente por
  // (cpf, grupo, cota): não duplica as que já existem no seed nem em re-boots.
  await db.query(`
    INSERT INTO acompanhamento
      (cliente_nome,cliente_cpf,grupo,cota,contrato,data_venda,prazo_grupo,taxa_adm,proximo_reajuste,parcelas_pagas,soma_parcelas_pagas,prazo_restante,saldo_devedor)
    SELECT v.* FROM (VALUES
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0163','102273','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0225','102278','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0242','102271','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0247','102268','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0249','102269','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0306','102266','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0369','102267','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0377','102282','06/12/2024',150,'18,50%','01/02/2027',15,7185.06,135,140358.50),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0418','102276','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0424','102277','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0435','102270','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0453','102275','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0474','102274','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001002','0477','102280','06/12/2024',150,'18,50%','01/02/2027',15,8981.34,135,175448.12),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0041','102904','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0054','102894','22/03/2025',150,'18,50%','20/03/2026',11,5233.68,139,136985.98),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0106','102895','22/03/2025',150,'18,50%','20/03/2026',11,5669.82,139,148401.48),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0117','102909','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0164','102905','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0166','102903','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0179','102908','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0201','102898','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0206','102907','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0212','102901','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0229','102906','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0240','102902','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0286','102900','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0293','102899','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0323','102910','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0352','102896','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47),
      ('Stefan Wolansky Negrao','164.607.068-24','001003','0495','102897','22/03/2025',150,'18,50%','20/03/2026',11,6542.10,139,171232.47)
    ) AS v(cliente_nome,cliente_cpf,grupo,cota,contrato,data_venda,prazo_grupo,taxa_adm,proximo_reajuste,parcelas_pagas,soma_parcelas_pagas,prazo_restante,saldo_devedor)
    WHERE NOT EXISTS (
      SELECT 1 FROM acompanhamento a
      WHERE a.cliente_cpf = v.cliente_cpf AND a.grupo = v.grupo AND a.cota = v.cota
    )
  `);
  console.log('Cotas adicionais Stefan (001002/001003) OK (idempotente)!');

  // Valor do bem (= "Valor Crédito" do extrato) por cota do Stefan.
  // Atualiza tanto as do seed quanto as adicionais; idempotente (só seta o valor).
  await db.query(`
    UPDATE acompanhamento a SET valor_do_bem = v.valor
    FROM (VALUES
      ('001001','0026',157650.00),
      ('001001','0081',157650.00),
      ('001001','0090',157650.00),
      ('001001','0124',157650.00),
      ('001001','0138',157650.00),
      ('001001','0193',157650.00),
      ('001001','0201',157650.00),
      ('001001','0218',157650.00),
      ('001001','0234',157650.00),
      ('001001','0242',157650.00),
      ('001001','0244',157650.00),
      ('001001','0269',157650.00),
      ('001001','0310',126120.00),
      ('001001','0321',157650.00),
      ('001001','0344',157650.00),
      ('001001','0435',136630.00),
      ('001001','0479',157650.00),
      ('001002','0018',155850.00),
      ('001002','0068',155850.00),
      ('001002','0141',135070.00),
      ('001002','0163',155850.00),
      ('001002','0225',155850.00),
      ('001002','0242',155850.00),
      ('001002','0247',155850.00),
      ('001002','0249',155850.00),
      ('001002','0306',155850.00),
      ('001002','0369',155850.00),
      ('001002','0377',124680.00),
      ('001002','0418',155850.00),
      ('001002','0424',155850.00),
      ('001002','0435',155850.00),
      ('001002','0453',155850.00),
      ('001002','0474',155850.00),
      ('001002','0477',155850.00),
      ('001003','0041',150000.00),
      ('001003','0054',120000.00),
      ('001003','0106',130000.00),
      ('001003','0117',150000.00),
      ('001003','0164',150000.00),
      ('001003','0166',150000.00),
      ('001003','0179',150000.00),
      ('001003','0201',150000.00),
      ('001003','0206',150000.00),
      ('001003','0212',150000.00),
      ('001003','0229',150000.00),
      ('001003','0240',150000.00),
      ('001003','0286',150000.00),
      ('001003','0293',150000.00),
      ('001003','0323',150000.00),
      ('001003','0352',150000.00),
      ('001003','0495',150000.00)
    ) AS v(grupo,cota,valor)
    WHERE a.grupo = v.grupo AND a.cota = v.cota
  `);
  console.log('Valor do bem (Stefan) atualizado!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Tabela "password_reset_tokens" OK!');

  // Coluna lance_ultimo_mes em simulador_grupos
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE simulador_grupos ADD COLUMN lance_ultimo_mes DECIMAL(5,1);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log('Coluna "lance_ultimo_mes" em simulador_grupos OK!');

  // Histórico mensal grupo 2130 (auto)
  const { rows: rows2130 } = await db.query(
    'SELECT COUNT(*) FROM contemplacao_auto WHERE grupo = 2130'
  );
  if (parseInt(rows2130[0].count) === 0) {
    await db.query(`
      INSERT INTO contemplacao_auto
        (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
      VALUES
        (2130,'Outubro/2025',92.5,5,4,'0.800','0.6538',NULL),
        (2130,'Novembro/2025',91.25,4,4,'1.000',NULL,NULL),
        (2130,'Dezembro/2025',90.0,3,2,'0.667',NULL,NULL),
        (2130,'Janeiro/2026',88.75,11,9,'0.818',NULL,NULL),
        (2130,'Fevereiro/2026',87.5,6,6,'1.000',NULL,NULL),
        (2130,'Março/2026',86.25,17,7,'0.412',NULL,NULL),
        (2130,'Abril/2026',85.0,6,2,'0.333',NULL,NULL)
    `);
    console.log('Histórico grupo 2130 (auto) inserido!');
  } else {
    console.log('Histórico grupo 2130 (auto) já existe, pulando.');
  }

  // Atualiza simulador_grupos para grupo 2130 (auto)
  await db.query(`
    UPDATE simulador_grupos
    SET media_contemplacao = 0.6538,
        lance_ultimo_mes   = 85.0,
        sem_media_contemplacao = FALSE
    WHERE numero_grupo = 2130 AND modalidade = 'auto'
  `);
  console.log('simulador_grupos grupo 2130 (auto) atualizado!');

  // Corrige parcelas grupo 2130 (sem redutor) — taxa 15% no lugar de 18%
  const cotas2130 = [
    [90000,  1539.13], [95000,  1624.64], [100000, 1710.14],
    [105000, 1795.65], [110000, 1881.16], [115000, 1966.67],
    [120000, 2052.17], [125000, 2137.68], [130000, 2223.19],
    [135000, 2308.70], [140000, 2394.20], [145000, 2479.71],
    [150000, 2565.22],
  ];
  for (const [bem, parcela] of cotas2130) {
    await db.query(
      `UPDATE simulador_cotas SET parcela = $1
       WHERE numero_grupo = 2130 AND bem_referencia = $2 AND redutor_parcela = 0`,
      [parcela, bem]
    );
  }
  console.log('Parcelas grupo 2130 (sem redutor) corrigidas!');

  // ── Métricas AUTO curados (2127, …): média = ÚLTIMOS 12 MESES ────────────────
  // Diferente do restante do auto (média curada/all-time), estes grupos da campanha
  // usam a MESMA lógica do imóvel: média = soma(contemplados)/soma(ofertados) dos
  // até-12 meses mais recentes de contemplacao_auto, recalculada a cada boot e
  // acompanhando novos meses. Aqui `qnt_lances` é o total de cotas OFERTADAS no mês.
  // Escopo restrito à lista AUTO_CURADOS para não tocar 2129/2133 (onde SUM/SUM
  // bruto dá valores errados).
  //
  // Estes grupos JÁ têm histórico importado (junho/2025..). Os meses abaixo são
  // acréscimos: inseridos por mês só se ainda não existirem (anti-join por
  // grupo+mes), então rodar de novo é idempotente e não duplica nem apaga nada.
  // Para adicionar um mês novo, é só acrescentar sua linha ao VALUES do grupo.
  const mesesNovosAuto = `
    INSERT INTO contemplacao_auto
      (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal, media_contemplacao, media_lance_percent)
    SELECT v.grupo, v.mes, v.lance_percent, v.qnt_lances, v.contemplados, v.contemplacao_mensal, NULL, NULL
    FROM (VALUES
      (2127,'Maio/2026',   58.75::decimal,  63,  9, '0.143'),
      (2127,'Junho/2026',  57.50::decimal, 168,  6, '0.036'),
      (2127,'Julho/2026',  56.25::decimal, 173, 17, '0.098'),
      (2128,'Maio/2026',   64.50::decimal,  23,  7, '0.304'),
      (2128,'Junho/2026',  71.80::decimal,  54,  0, '0.000'),
      (2128,'Julho/2026',  50.00::decimal,  24, 24, '1.000')
    ) AS v(grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal)
    WHERE NOT EXISTS (
      SELECT 1 FROM contemplacao_auto c WHERE c.grupo = v.grupo AND c.mes = v.mes
    )`;
  const resMesesNovos = await db.query(mesesNovosAuto);
  console.log(`Meses novos auto (2127/2128) inseridos: ${resMesesNovos.rowCount}`);

  // Recálculo autossuficiente da média (até 12 meses) e do lance do último mês.
  {
    const AUTO_CURADOS = [2127, 2128];
    const ORD_MES_AUTO = `CASE
        WHEN mes NOT LIKE '%/%' THEN
          CASE LOWER(mes)
            WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
            WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
            WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
            WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
            ELSE 99 END
        ELSE
          (CAST(SPLIT_PART(mes,'/',2) AS INTEGER) - 2024) * 12 +
          CASE LOWER(SPLIT_PART(mes,'/',1))
            WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
            WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
            WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
            WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
            ELSE 0 END + 100
        END`;
    const MEDIA12_AUTO = `
      WITH ranked AS (
        SELECT grupo, contemplados, qnt_lances,
               ROW_NUMBER() OVER (PARTITION BY grupo ORDER BY ${ORD_MES_AUTO} DESC) rn
        FROM contemplacao_auto WHERE grupo = ANY($1::int[])
      ),
      agg AS (
        SELECT grupo, SUM(contemplados)::numeric sc, SUM(qnt_lances)::numeric sq
        FROM ranked WHERE rn <= 12 GROUP BY grupo
      )
      SELECT grupo, ROUND(sc / sq, 6) media12 FROM agg WHERE sq > 0`;
    // Resumo de Métricas + card do Simulador leem simulador_grupos.media_contemplacao.
    await db.query(`
      UPDATE simulador_grupos sg SET media_contemplacao = m.media12, sem_media_contemplacao = FALSE
      FROM (${MEDIA12_AUTO}) m
      WHERE sg.numero_grupo = m.grupo AND sg.modalidade = 'auto'`, [AUTO_CURADOS]);
    // Lance do último mês = lance_percent do mês mais recente.
    await db.query(`
      UPDATE simulador_grupos sg SET lance_ultimo_mes = x.lance_percent
      FROM (
        SELECT grupo, lance_percent FROM (
          SELECT grupo, lance_percent,
                 ROW_NUMBER() OVER (PARTITION BY grupo ORDER BY ${ORD_MES_AUTO} DESC) rn
          FROM contemplacao_auto WHERE grupo = ANY($1::int[])
        ) y WHERE rn = 1
      ) x
      WHERE sg.numero_grupo = x.grupo AND sg.modalidade = 'auto'`, [AUTO_CURADOS]);
    // No detalhe, o front pega a 1ª linha com media_contemplacao != null: fica só
    // na linha do mês mais recente (mesma convenção do imóvel na tabela contemplacao).
    await db.query(
      `UPDATE contemplacao_auto SET media_contemplacao = NULL WHERE grupo = ANY($1::int[])`,
      [AUTO_CURADOS]
    );
    await db.query(`
      WITH latest AS (
        SELECT id, grupo FROM (
          SELECT id, grupo, ROW_NUMBER() OVER (PARTITION BY grupo ORDER BY ${ORD_MES_AUTO} DESC) rn
          FROM contemplacao_auto WHERE grupo = ANY($1::int[])
        ) x WHERE rn = 1
      ), m AS (${MEDIA12_AUTO})
      UPDATE contemplacao_auto c SET media_contemplacao = ROUND(m.media12, 4)::text
      FROM latest l, m WHERE c.id = l.id AND l.grupo = m.grupo`, [AUTO_CURADOS]);
    console.log('Média de contemplação 12m (auto curados) recalculada!');
  }

  // ── Auto — campanha vigente: taxa base, grupo 2134 e redutor do 2127 ─────────
  // Roda antes do recálculo de parcelas para que este preencha as parcelas.
  // prazo_restante NÃO é tocado aqui (persiste do banco / das migrations de prazo).

  // Taxa base (sem redutor) autoritativa dos grupos da campanha auto.
  await db.query(`
    UPDATE simulador_grupos sg
    SET taxa_adm = v.taxa_adm
    FROM (VALUES
      (2127, 0.150),
      (2128, 0.180),
      (2130, 0.150),
      (2134, 0.115),
      (3002, 0.120)
    ) AS v(numero_grupo, taxa_adm)
    WHERE sg.numero_grupo = v.numero_grupo
      AND sg.administradora = 'CNP'
      AND sg.modalidade = 'auto'
  `);

  // Grupo 2134 (novo): cabeçalho. prazo_restante = prazo_total = 100 (grupo novo).
  // ON CONFLICT DO NOTHING preserva o prazo já ajustado por migrations de prazo.
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao)
    VALUES
      (2134, 'auto', 'CNP', 0.115, 0.17, 0.03, 'INPC', 'SETEMBRO', 0.30, 100, 100, TRUE)
    ON CONFLICT (numero_grupo, modalidade) DO NOTHING
  `);

  // Grupo 2134: cotas de 50 a 80 mil (de 10 em 10), sem redutor e com redutor 50%.
  // parcela = 0 provisória; recalculada no bloco de recálculo abaixo.
  await db.query(`
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
    ON CONFLICT DO NOTHING
  `);

  // Grupo 2134: plano opcional com taxa adm de 6% (taxa_adm por cota = 0.06).
  // Cotas de 50 a 80 mil de 5 em 5, sem redutor e com redutor 50% (mesma taxa 6%:
  // o redutor só divide a parcela por 2). Autoritativo (apaga+reinsere o subconjunto
  // 6%) para a granularidade poder mudar sem deixar cotas órfãs.
  // parcela = 0 provisória; recalculada no bloco de recálculo abaixo com COALESCE.
  await db.query(`DELETE FROM simulador_cotas WHERE numero_grupo = 2134 AND modalidade = 'auto' AND taxa_adm = 0.06`);
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela, taxa_adm)
    SELECT 2134, 'auto', c, c, 0, r, 0.06
    FROM generate_series(50000, 80000, 5000) AS c
    CROSS JOIN (VALUES (0), (0.5)) AS red(r)
    ON CONFLICT DO NOTHING
  `);

  // Grupo 2127: opção "com redutor 50%" espelhando as cotas sem redutor.
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    SELECT numero_grupo, modalidade, bem_referencia, cota, 0, 0.5
    FROM simulador_cotas
    WHERE numero_grupo = 2127 AND modalidade = 'auto' AND redutor_parcela = 0
    ON CONFLICT DO NOTHING
  `);
  console.log('Auto campanha (taxas, grupo 2134, redutor 2127) OK!');

  // ── UNE CONSÓRCIOS — grupo auto 5002 (novo, set/2026) ───────────────────────
  // Administradora nova, fora do modelo CNP (sem tabelas de contemplação/lance),
  // mas renderiza no MESMO fluxo de cards da CNP (grupos + cotas), selecionável
  // pelo toggle de administradora. Fonte: tabela oficial UNE — 36 meses, taxa adm
  // 15,5% total (0,430%/mês), SEM fundo de reserva, SEM redutor, seguro opcional.
  // prazo_restante = prazo_total = 36 (grupo novo; não decrementa: só CNP decrementa).
  // Idempotente por NOT EXISTS / DELETE+INSERT — NÃO usa ON CONFLICT (simulador_cotas
  // não tem índice único, ver bug do grupo 2129).
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao)
    SELECT 5002, 'auto', 'UNE', 0.155, NULL, 0,
           'INPC', 'ANUAL', 0.50, 36, 36, TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM simulador_grupos
      WHERE numero_grupo = 5002 AND modalidade = 'auto' AND administradora = 'UNE'
    )
  `);
  // Autoritativo (cobre a linha já existente, que o NOT EXISTS acima não atualiza):
  // lance embutido máximo do 5002 = 50%.
  await db.query(`
    UPDATE simulador_grupos SET lance_embutido_max = 0.50
    WHERE numero_grupo = 5002 AND modalidade = 'auto' AND administradora = 'UNE'
  `);
  // Cotas curadas da tabela UNE (crédito → parcela). parcela_fixa = TRUE: o recálculo
  // automático de parcelas NÃO as sobrescreve (o arredondamento divergiria em ~1
  // centavo). DELETE+INSERT torna idempotente e permite a tabela mudar sem órfãs.
  await db.query(`DELETE FROM simulador_cotas WHERE numero_grupo = 5002 AND modalidade = 'auto'`);
  await db.query(`
    INSERT INTO simulador_cotas
      (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela, parcela_fixa)
    VALUES
      (5002,'auto', 29475.37, 29475.37,  945.66, 0, TRUE),
      (5002,'auto', 35370.45, 35370.45, 1134.80, 0, TRUE),
      (5002,'auto', 41265.52, 41265.52, 1323.94, 0, TRUE),
      (5002,'auto', 47160.60, 47160.60, 1513.07, 0, TRUE),
      (5002,'auto', 53055.66, 53055.66, 1702.21, 0, TRUE),
      (5002,'auto', 58950.74, 58950.74, 1891.34, 0, TRUE)
  `);
  console.log('UNE grupo auto 5002 OK!');

  // Grupo 1035 (imóvel): opção "com redutor 50%" espelhando as cotas sem redutor.
  // parcela = 0 provisória; recalculada no bloco abaixo (usa taxa_adm_redutor = 0.19).
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    SELECT numero_grupo, modalidade, bem_referencia, cota, 0, 0.5
    FROM simulador_cotas
    WHERE numero_grupo = 1035 AND modalidade = 'imovel' AND redutor_parcela = 0
    ON CONFLICT DO NOTHING
  `);
  console.log('Imóvel redutor 50% grupo 1035 OK!');

  // Grupo 1042 (imóvel): tabela de cotas autoritativa (16 créditos informados pela
  // área comercial, ago/2026). Reseta e redefine — apaga o que houver e reinsere,
  // com opção sem redutor e com redutor 50% (campanha vigente). bem_referencia = cota.
  // parcela = 0 provisória; recalculada no bloco abaixo (usa taxa_adm_redutor = 0.19).
  await db.query(`DELETE FROM simulador_cotas WHERE numero_grupo = 1042 AND modalidade = 'imovel'`);
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    VALUES
      (1042,'imovel', 211120.28, 211120.28, 0, 0),
      (1042,'imovel', 225194.97, 225194.97, 0, 0),
      (1042,'imovel', 239269.65, 239269.65, 0, 0),
      (1042,'imovel', 253344.34, 253344.34, 0, 0),
      (1042,'imovel', 267419.03, 267419.03, 0, 0),
      (1042,'imovel', 281493.71, 281493.71, 0, 0),
      (1042,'imovel', 295568.40, 295568.40, 0, 0),
      (1042,'imovel', 309643.09, 309643.09, 0, 0),
      (1042,'imovel', 323717.77, 323717.77, 0, 0),
      (1042,'imovel', 337792.45, 337792.45, 0, 0),
      (1042,'imovel', 351867.13, 351867.13, 0, 0),
      (1042,'imovel', 365941.83, 365941.83, 0, 0),
      (1042,'imovel', 380016.52, 380016.52, 0, 0),
      (1042,'imovel', 394091.20, 394091.20, 0, 0),
      (1042,'imovel', 408165.88, 408165.88, 0, 0),
      (1042,'imovel', 422240.57, 422240.57, 0, 0),
      (1042,'imovel', 211120.28, 211120.28, 0, 0.5),
      (1042,'imovel', 225194.97, 225194.97, 0, 0.5),
      (1042,'imovel', 239269.65, 239269.65, 0, 0.5),
      (1042,'imovel', 253344.34, 253344.34, 0, 0.5),
      (1042,'imovel', 267419.03, 267419.03, 0, 0.5),
      (1042,'imovel', 281493.71, 281493.71, 0, 0.5),
      (1042,'imovel', 295568.40, 295568.40, 0, 0.5),
      (1042,'imovel', 309643.09, 309643.09, 0, 0.5),
      (1042,'imovel', 323717.77, 323717.77, 0, 0.5),
      (1042,'imovel', 337792.45, 337792.45, 0, 0.5),
      (1042,'imovel', 351867.13, 351867.13, 0, 0.5),
      (1042,'imovel', 365941.83, 365941.83, 0, 0.5),
      (1042,'imovel', 380016.52, 380016.52, 0, 0.5),
      (1042,'imovel', 394091.20, 394091.20, 0, 0.5),
      (1042,'imovel', 408165.88, 408165.88, 0, 0.5),
      (1042,'imovel', 422240.57, 422240.57, 0, 0.5)
    ON CONFLICT DO NOTHING
  `);
  console.log('Cotas grupo 1042 (16 créditos ago/2026) OK!');

  // ── Grupo 1047 (imóvel CNP): plano único 10%, sem redutor ───────────────────
  // Condição especial de setembro: 1047 fica SÓ com as 16 cartas a 10% (parcela
  // FIXA "com desconto" do card), sem redutor e sem o plano padrão 15%/18%.
  // Créditos reajustados (INPC/agosto, fator ~1,09436), bem nominal 150k–300k.
  // As cotas 10% viram o PLANO PADRÃO (taxa_adm = NULL): assim a visão inicial já
  // mostra o 10% (o simulador abre no plano de taxa NULL). parcela_fixa = TRUE →
  // o recálculo não sobrescreve a parcela com desconto. A taxa 10% do grupo fica
  // no cabeçalho (UPDATE abaixo). Autoritativo — apaga e redefine a cada boot.
  await db.query(`UPDATE simulador_grupos SET taxa_adm = 0.10 WHERE numero_grupo = 1047 AND modalidade = 'imovel'`);
  await db.query(`DELETE FROM simulador_cotas WHERE numero_grupo = 1047 AND modalidade = 'imovel'`);
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela, taxa_adm, parcela_fixa)
    VALUES
      (1047,'imovel',150000,164154,1060,0,NULL,TRUE),
      (1047,'imovel',160000,175098,1131,0,NULL,TRUE),
      (1047,'imovel',170000,186041,1202,0,NULL,TRUE),
      (1047,'imovel',180000,196985,1273,0,NULL,TRUE),
      (1047,'imovel',190000,207929,1343,0,NULL,TRUE),
      (1047,'imovel',200000,218872,1414,0,NULL,TRUE),
      (1047,'imovel',210000,229816,1485,0,NULL,TRUE),
      (1047,'imovel',220000,240760,1555,0,NULL,TRUE),
      (1047,'imovel',230000,251703,1626,0,NULL,TRUE),
      (1047,'imovel',240000,262647,1697,0,NULL,TRUE),
      (1047,'imovel',250000,273590,1767,0,NULL,TRUE),
      (1047,'imovel',260000,284534,1838,0,NULL,TRUE),
      (1047,'imovel',270000,295478,1909,0,NULL,TRUE),
      (1047,'imovel',280000,306421,1980,0,NULL,TRUE),
      (1047,'imovel',290000,317365,2050,0,NULL,TRUE),
      (1047,'imovel',300000,328308,2121,0,NULL,TRUE)
    ON CONFLICT DO NOTHING
  `);
  console.log('Cotas grupo 1047 (plano único 10%, sem redutor) OK!');

  // ── Grupo 1051 (imóvel CNP): premissas + cotas ──────────────────────────────
  // taxa_adm=0.20 e taxa_adm_redutor=0.19 já são forçados pela campanha julho
  // (blocos acima, 1051 está nas listas). prazo_restante=228 / total 240.
  // sem_media_contemplacao: a média virá da aba de Métricas depois.
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao, decrementa_prazo)
    VALUES
      (1051, 'imovel', 'CNP', 0.20, 0.19, 0.037, 'INPC', 'SETEMBRO', 0.30, 228, 240, TRUE, TRUE)
    ON CONFLICT (numero_grupo, modalidade) DO NOTHING
  `);
  // Cotas 150k a 300k (de 10 em 10), sem redutor e com redutor 50%.
  // parcela=0 provisória — recalculada no bloco de recálculo logo abaixo.
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    SELECT 1051, 'imovel', c, c, 0, r
    FROM generate_series(150000, 300000, 10000) AS c
    CROSS JOIN (VALUES (0), (0.5)) AS red(r)
    ON CONFLICT DO NOTHING
  `);
  console.log('simulador_grupos/cotas 1051 inseridos!');

  // ── Grupo 1049 (imóvel CNP): premissas + cotas ──────────────────────────────
  // "Apaga o que tem e redefine" (autoritativo a cada boot): reseta grupo+cotas.
  // taxa_adm sem redutor 15% / com redutor 50% = 18%; fundo 3,7%.
  // prazo_restante=181 / total 200. Reajuste INPC/FEVEREIRO.
  // lance_embutido_max=0.30 e reajuste=INPC confirmados pela área comercial.
  // sem_media_contemplacao: média virá depois.
  await db.query(`DELETE FROM simulador_cotas WHERE numero_grupo = 1049 AND modalidade = 'imovel'`);
  await db.query(`DELETE FROM simulador_grupos WHERE numero_grupo = 1049 AND modalidade = 'imovel'`);
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao, decrementa_prazo)
    VALUES
      (1049, 'imovel', 'CNP', 0.15, 0.18, 0.037, 'INPC', 'FEVEREIRO', 0.30, 181, 200, TRUE, TRUE)
  `);
  // Cotas informadas pela área comercial (16 créditos, PA de R$ 10.389,79),
  // sem redutor e com redutor 50%. bem_referencia = cota.
  // parcela=0 provisória — recalculada no bloco de recálculo logo abaixo.
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    SELECT 1049, 'imovel', c, c, 0, r
    FROM (VALUES
      (155846.85), (166236.64), (176626.43), (187016.22),
      (197406.01), (207795.80), (218185.59), (228575.38),
      (238965.17), (249354.96), (259744.75), (270134.54),
      (280524.33), (290914.12), (301303.91), (311693.70)
    ) AS t(c)
    CROSS JOIN (VALUES (0), (0.5)) AS red(r)
  `);
  console.log('simulador_grupos/cotas 1049 inseridos!');

  // ── Grupo 1048 (imóvel CNP): premissas + cotas ──────────────────────────────
  // "Apaga o que tem e redefine" (autoritativo a cada boot): reseta grupo+cotas.
  // Condição especial setembro: taxa sem redutor 15% / com redutor 50% = 18%;
  // fundo 3,7%; lance embutido máx 30%; prazo_restante=180 / total=200.
  // Reajuste INPC/JANEIRO. sem_media_contemplacao: média virá das Métricas depois.
  await db.query(`DELETE FROM simulador_cotas WHERE numero_grupo = 1048 AND modalidade = 'imovel'`);
  await db.query(`DELETE FROM simulador_grupos WHERE numero_grupo = 1048 AND modalidade = 'imovel'`);
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao, decrementa_prazo)
    VALUES
      (1048, 'imovel', 'CNP', 0.15, 0.18, 0.037, 'INPC', 'JANEIRO', 0.30, 180, 200, TRUE, TRUE)
  `);
  // Cotas informadas pela área comercial (16 créditos, PA de R$ 10.417,78),
  // sem redutor e com redutor 50%. bem_referencia = cota.
  // parcela=0 provisória — recalculada no bloco de recálculo logo abaixo.
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    SELECT 1048, 'imovel', c, c, 0, r
    FROM (VALUES
      (156266.70), (166684.48), (177102.26), (187520.04),
      (197937.82), (208355.60), (218773.38), (229191.16),
      (239608.94), (250026.72), (260444.50), (270862.28),
      (281280.06), (291697.84), (302115.62), (312533.40)
    ) AS t(c)
    CROSS JOIN (VALUES (0), (0.5)) AS red(r)
  `);
  console.log('simulador_grupos/cotas 1048 inseridos!');

  // ── Grupo 41056 (imóvel CNP): grupo novo ────────────────────────────────────
  // "Apaga o que tem e redefine" (autoritativo a cada boot). Cartas de 200k a
  // 300k (de 10 em 10). taxa_adm sem redutor 15% / com redutor 50% = 18%;
  // fundo 3,7%; lance embutido máx 30%; prazo 240 (grupo novo: restante=total).
  // Reajuste FIXO/OUTUBRO. sem_media_contemplacao: média virá das Métricas depois.
  // parcela=0 provisória — recalculada no bloco de recálculo logo abaixo.
  await db.query(`DELETE FROM simulador_cotas WHERE numero_grupo = 41056 AND modalidade = 'imovel'`);
  await db.query(`DELETE FROM simulador_grupos WHERE numero_grupo = 41056 AND modalidade = 'imovel'`);
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, administradora, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao, decrementa_prazo)
    VALUES
      (41056, 'imovel', 'CNP', 0.15, 0.18, 0.037, 'FIXO', 'OUTUBRO', 0.30, 240, 240, TRUE, TRUE)
  `);
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    SELECT 41056, 'imovel', c, c, 0, r
    FROM generate_series(200000, 300000, 10000) AS c
    CROSS JOIN (VALUES (0), (0.5)) AS red(r)
  `);
  console.log('simulador_grupos/cotas 41056 inseridos!');

  // ── Redutor 50%: ativo APENAS nos grupos em campanha vigente ────────────────
  // A opção "com redutor 50%" só aparece no simulador quando o grupo tem cotas
  // com redutor_parcela = 0.5. Removemos essas cotas de TODOS os grupos fora da
  // lista (imóvel e auto), então só os grupos abaixo mantêm a opção. Autoritativo
  // a cada boot — roda depois de todas as inserções de cotas.
  await db.query(`
    DELETE FROM simulador_cotas
    WHERE modalidade = 'imovel' AND redutor_parcela = 0.5
      AND numero_grupo NOT IN (1035, 1042, 1043, 1044, 1048, 1049, 1050, 1055, 41056)
  `);
  await db.query(`
    DELETE FROM simulador_cotas
    WHERE modalidade = 'auto' AND redutor_parcela = 0.5
      AND numero_grupo NOT IN (2127, 2130, 2134, 3002)
  `);
  console.log('Redutor 50%: cotas 0.5 fora da campanha removidas!');

  // Recalcula todas as parcelas com base no prazo_restante atual.
  // COALESCE(sc.taxa_adm, sg.taxa_adm): cotas com taxa própria (ex.: plano 6% do
  // 2134) usam a sua; as demais usam a taxa do grupo.
  await db.query(`
    UPDATE simulador_cotas sc
    SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante)::numeric, 2)
    FROM simulador_grupos sg
    WHERE sc.numero_grupo = sg.numero_grupo
      AND sc.modalidade = sg.modalidade
      AND sc.redutor_parcela = 0
      AND sg.prazo_restante > 0
      AND NOT COALESCE(sc.parcela_fixa, FALSE)
  `);
  // Com redutor 50%: cota com taxa própria (sc.taxa_adm) usa a sua; senão a taxa
  // com redutor do grupo (taxa_adm_redutor), caindo na taxa base se não houver.
  await db.query(`
    UPDATE simulador_cotas sc
    SET parcela = ROUND((sc.cota * (1 + COALESCE(sc.taxa_adm, sg.taxa_adm_redutor, sg.taxa_adm) + sg.fundo_reserva) / sg.prazo_restante / 2)::numeric, 2)
    FROM simulador_grupos sg
    WHERE sc.numero_grupo = sg.numero_grupo
      AND sc.modalidade = sg.modalidade
      AND sc.redutor_parcela = 0.5
      AND sg.prazo_restante > 0
      AND NOT COALESCE(sc.parcela_fixa, FALSE)
  `);
  console.log('Recálculo de parcelas concluído!');

  // Seed producao (idempotent — só insere se tabela vazia)
  await seedProducao();

  // Colunas assessor/email_assessor em comissoes
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE comissoes ADD COLUMN assessor VARCHAR(200);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE comissoes ADD COLUMN email_assessor VARCHAR(200);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log('Colunas assessor/email_assessor em comissoes OK!');

  // Popula assessor/email_assessor via JOIN com producao (por cliente, última ocorrência)
  await db.query(`
    UPDATE comissoes c
    SET
      assessor = p.assessor,
      email_assessor = p.email_assessor
    FROM (
      SELECT DISTINCT ON (cliente) cliente, assessor, email_assessor
      FROM producao
      WHERE assessor IS NOT NULL
      ORDER BY cliente, id DESC
    ) p
    WHERE UPPER(TRIM(c.cliente)) = UPPER(TRIM(p.cliente))
      AND c.email_assessor IS NULL
  `);
  console.log('comissoes assessor/email_assessor populados!');

  // Colunas de médias 12m e 6m em simulador_grupos
  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS media_contemplacao_12m NUMERIC(10,6)`);
  await db.query(`ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS media_contemplacao_6m NUMERIC(10,6)`);
  console.log('Colunas media_contemplacao_12m e media_contemplacao_6m em simulador_grupos OK!');

  // ── Coluna observacao em contemplacao_auto ──────────────────────────────────
  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE contemplacao_auto ADD COLUMN observacao TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log('Coluna observacao em contemplacao_auto OK!');

  // ── Grupo 2129 (auto): simulador_grupos ─────────────────────────────────────
  await db.query(`
    INSERT INTO simulador_grupos
      (numero_grupo, modalidade, taxa_adm, taxa_adm_redutor, fundo_reserva,
       reajuste, mes_reajuste, lance_embutido_max, prazo_restante, prazo_total,
       sem_media_contemplacao)
    VALUES
      (2129, 'auto', 0.17, NULL, 0.03, 'INPC', 'JANEIRO', 0.30, 64, 80, FALSE)
    ON CONFLICT DO NOTHING
  `);
  console.log('simulador_grupos 2129 inserido!');

  // ── Grupo 2129: cotas ────────────────────────────────────────────────────────
  await db.query(`
    INSERT INTO simulador_cotas (numero_grupo, modalidade, bem_referencia, cota, parcela, redutor_parcela)
    VALUES
      (2129,'auto',  93760.02,  93760.02, 1758.00, 0),
      (2129,'auto',  98968.91,  98968.91, 1855.67, 0),
      (2129,'auto', 104177.80, 104177.80, 1953.33, 0),
      (2129,'auto', 109386.69, 109386.69, 2051.00, 0),
      (2129,'auto', 114595.58, 114595.58, 2148.67, 0),
      (2129,'auto', 119804.47, 119804.47, 2246.33, 0),
      (2129,'auto', 125013.36, 125013.36, 2344.00, 0),
      (2129,'auto', 130222.25, 130222.25, 2441.67, 0),
      (2129,'auto', 135431.14, 135431.14, 2539.33, 0),
      (2129,'auto', 140640.03, 140640.03, 2637.00, 0),
      (2129,'auto', 145848.92, 145848.92, 2734.67, 0),
      (2129,'auto', 151057.81, 151057.81, 2832.33, 0),
      (2129,'auto', 156266.70, 156266.70, 2930.00, 0)
    ON CONFLICT DO NOTHING
  `);
  console.log('simulador_cotas 2129 inseridas!');

  // ── Grupo 2129: histórico contemplacao_auto Out/2025–Abr/2026 ───────────────
  // Correção: este bloco antes usava ON CONFLICT DO NOTHING, mas contemplacao_auto
  // não tem índice único em (grupo, mes) — então nada conflitava e as 7 linhas do
  // 2129 eram REINSERIDAS a cada boot (meses duplicados na aba de Métricas).
  // 1) Remove as duplicatas históricas, mantendo a linha de menor id por mês.
  await db.query(`
    DELETE FROM contemplacao_auto a USING contemplacao_auto b
    WHERE a.id > b.id AND a.grupo = b.grupo AND a.mes = b.mes AND a.grupo = 2129
  `);
  // 2) Insere só se o grupo ainda não tiver histórico (idempotente, como o 2130).
  const { rows: rows2129 } = await db.query(
    'SELECT COUNT(*) FROM contemplacao_auto WHERE grupo = 2129'
  );
  if (parseInt(rows2129[0].count) === 0) {
    await db.query(`
      INSERT INTO contemplacao_auto
        (grupo, mes, lance_percent, qnt_lances, contemplados, contemplacao_mensal,
         media_contemplacao, media_lance_percent, observacao)
      VALUES
        (2129,'outubro',  88.75, 11, 8, '73%', NULL, NULL, 'Este grupo não está em lance máximo'),
        (2129,'novembro', 87.50, 14,11, '79%', NULL, NULL, 'Este grupo não está em lance máximo'),
        (2129,'dezembro', 86.25,  8, 4, '50%', NULL, NULL, 'Este grupo não está em lance máximo'),
        (2129,'janeiro',  85.00,  7, 6, '86%', NULL, NULL, 'Este grupo não está em lance máximo'),
        (2129,'fevereiro',83.75,  6, 5, '83%', NULL, NULL, 'Este grupo não está em lance máximo'),
        (2129,'março',    82.50,  7, 5, '71%', NULL, NULL, 'Este grupo não está em lance máximo'),
        (2129,'Abril/2026',72.00,  5, 5,'100%', NULL, NULL, 'Este grupo não está em lance máximo')
    `);
    console.log('contemplacao_auto 2129 inserida!');
  } else {
    console.log('contemplacao_auto 2129 já existe, pulando.');
  }

  // ── Atualiza lance_ultimo_mes e media_contemplacao do grupo 2129 ─────────────
  await db.query(`
    UPDATE simulador_grupos
    SET lance_ultimo_mes   = 72.0,
        media_contemplacao = ROUND((8+11+4+6+5+5+5)::numeric / NULLIF((11+14+8+7+6+7+5),0), 6)
    WHERE numero_grupo = 2129 AND modalidade = 'auto'
  `);
  console.log('simulador_grupos 2129 atualizado!');

  // ── Corrige contemplacao_mensal grupo 2129 (formato decimal) ─────────────────
  await db.query(`
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.7273' WHERE grupo = 2129 AND mes = 'outubro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.7857' WHERE grupo = 2129 AND mes = 'novembro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.5000' WHERE grupo = 2129 AND mes = 'dezembro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.8571' WHERE grupo = 2129 AND mes = 'janeiro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.8333' WHERE grupo = 2129 AND mes = 'fevereiro';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.7143' WHERE grupo = 2129 AND mes = 'março';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 2129 AND mes = 'Abril/2026';
  `);

  // ── Corrige contemplacao_mensal grupos 2125–2128, 2132, 2133, 3002 ───────────
  await db.query(`
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.1808' WHERE grupo = 2125 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.0957' WHERE grupo = 2126 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.1061' WHERE grupo = 2127 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.5909' WHERE grupo = 2128 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '0.2143' WHERE grupo = 2132 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 2133 AND mes = 'Abril/2026';
    UPDATE contemplacao_auto SET contemplacao_mensal = '1.0000' WHERE grupo = 3002 AND mes = 'Abril/2026';
  `);
  console.log('contemplacao_mensal corrigida (formato decimal)!');

  // ── Administradora: nov/2025 em diante = "Consórcio XP" (rede de segurança) ───
  // Idempotente: só preenche quem está vazio, então não sobrescreve marcações
  // específicas (ex.: cotas Embracon). A producao de nov/2025+ é padronizada pelo
  // importador scripts/import_vendas_mes.js (a partir das planilhas Wflow), que já
  // grava administradora; este UPDATE só reclassifica eventuais linhas sem ela.
  await db.query(`
    UPDATE producao
       SET administradora = 'Consórcio XP'
     WHERE ((ano = 2025 AND mes >= 11) OR ano >= 2026)
       AND (administradora IS NULL OR TRIM(administradora) = '')
  `);
  console.log('Administradora "Consórcio XP" aplicada (nov/2025+)!');

  // ── Reuniões ─────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS reunioes (
      id                    SERIAL PRIMARY KEY,
      google_event_id       VARCHAR(255) UNIQUE,
      titulo                VARCHAR(500),
      data_reuniao          TIMESTAMP,
      participantes         JSONB,
      gmail_message_id      VARCHAR(255),
      ata_original          TEXT,
      resumo_ia             TEXT,
      proximos_passos       TEXT,
      status                VARCHAR(50) DEFAULT 'em_andamento',
      motivo_nao_fechamento TEXT,
      data_retorno          DATE,
      motivo_retorno        TEXT,
      assessor_email        VARCHAR(255),
      criado_em             TIMESTAMP DEFAULT NOW(),
      atualizado_em         TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "reunioes" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS tarefas_reuniao (
      id          SERIAL PRIMARY KEY,
      reuniao_id  INTEGER REFERENCES reunioes(id) ON DELETE CASCADE,
      descricao   TEXT NOT NULL,
      concluida   BOOLEAN DEFAULT FALSE,
      concluida_em TIMESTAMP,
      criado_em   TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "tarefas_reuniao" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS retornos_pendentes (
      id             SERIAL PRIMARY KEY,
      reuniao_id     INTEGER REFERENCES reunioes(id) ON DELETE CASCADE,
      cliente        VARCHAR(500),
      data_retorno   DATE NOT NULL,
      motivo_retorno TEXT,
      notificado_em  TIMESTAMP,
      concluido      BOOLEAN DEFAULT FALSE,
      concluido_em   TIMESTAMP,
      criado_em      TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "retornos_pendentes" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS google_tokens (
      id SERIAL PRIMARY KEY,
      tokens JSONB NOT NULL,
      atualizado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "google_tokens" OK!');

  await db.query(`ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP`);
  console.log('Coluna data_fim em reunioes OK!');

  // Reuniões excluídas manualmente: impede que o import as recrie do Calendar.
  await db.query(`
    CREATE TABLE IF NOT EXISTS reunioes_excluidas (
      google_event_id TEXT PRIMARY KEY,
      excluida_em      TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Tabela "reunioes_excluidas" OK!');

  // Remove duplicatas em simulador_grupos (mantém o id menor por numero_grupo+modalidade)
  await db.query(`
    DELETE FROM simulador_grupos
    WHERE id NOT IN (
      SELECT MIN(id) FROM simulador_grupos GROUP BY numero_grupo, modalidade
    )
  `);
  // Adiciona constraint única para evitar novas duplicatas
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_simulador_grupos_grupo_modalidade'
      ) THEN
        ALTER TABLE simulador_grupos ADD CONSTRAINT uq_simulador_grupos_grupo_modalidade UNIQUE (numero_grupo, modalidade);
      END IF;
    END $$;
  `);
  console.log('Duplicatas simulador_grupos removidas e constraint única adicionada!');

  // ── Suporte a múltiplas administradoras (CNP + Embracon) ────────────────────
  // Coluna administradora em simulador_grupos. Todas as linhas existentes são
  // CNP (default). As rotas CNP passam a filtrar por administradora = 'CNP'
  // para que grupos de outras administradoras (ex.: Embracon 7036) não vazem
  // para o Simulador/Multiplicador CNP.
  await db.query(
    `ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS administradora VARCHAR(20) NOT NULL DEFAULT 'CNP'`
  );
  console.log('Coluna administradora em simulador_grupos OK!');

  // decrementa_prazo: se FALSE, o grupo fica fora do "-1 mês em todos" do fechamento
  // de mês (rota PUT /admin/grupos/prazo/decrement). Reseta e redefine — autoritativo,
  // porque o 1055 já foi decrementado por engano uma vez e precisou de revert manual.
  await db.query(
    `ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS decrementa_prazo BOOLEAN NOT NULL DEFAULT TRUE`
  );
  await db.query(`UPDATE simulador_grupos SET decrementa_prazo = TRUE WHERE administradora = 'CNP'`);
  // 1055: prazo fixo em 240 — não decrementa no fechamento de mês.
  await db.query(`
    UPDATE simulador_grupos SET decrementa_prazo = FALSE
    WHERE administradora = 'CNP' AND modalidade = 'imovel' AND numero_grupo = 1055
  `);
  console.log('Coluna decrementa_prazo em simulador_grupos OK!');

  // Histórico mensal de lances da Embracon. Diferente do modelo CNP (1 série por
  // grupo/mês), a Embracon tem 3 modalidades por grupo/mês. lance_percent é NULL
  // para as modalidades de lance fixo (lance_fixo_50 e segundo_lance_fixo_25).
  await db.query(`
    CREATE TABLE IF NOT EXISTS simulador_lances_embracon (
      id SERIAL PRIMARY KEY,
      grupo INTEGER NOT NULL,
      mes DATE NOT NULL,
      modalidade VARCHAR(30) NOT NULL CHECK (
        modalidade IN ('lance_livre', 'lance_fixo_50', 'segundo_lance_fixo_25')
      ),
      contemplados INTEGER NOT NULL,
      ofertados INTEGER NOT NULL,
      lance_percent NUMERIC(6,4),
      created_at TIMESTAMP DEFAULT now(),
      UNIQUE(grupo, mes, modalidade)
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_lances_embracon_grupo_modalidade
      ON simulador_lances_embracon (grupo, modalidade)
  `);
  console.log('Tabela "simulador_lances_embracon" OK!');

  // ── Faixa de crédito e seguro prestamista em simulador_grupos ───────────────
  // credito_min/credito_max: a Embracon vende por faixa de crédito (passo de
  // 10 mil) em vez de cotas fixas, então o grupo carrega a faixa em vez de
  // linhas em simulador_cotas. seguro_prestamista_percent fica NULL até a taxa
  // ser confirmada por grupo.
  await db.query(`
    ALTER TABLE simulador_grupos
      ADD COLUMN IF NOT EXISTS credito_min NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS credito_max NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS seguro_prestamista_percent DECIMAL(5,4)
  `);
  // lance_contemplado_percent: % de lance que vem contemplando o grupo
  // (informativo). Coluna própria porque lance_maximo_contemplado é DECIMAL(5,2)
  // e a Embracon informa 4 casas (ex.: 58,5984%).
  await db.query(
    `ALTER TABLE simulador_grupos ADD COLUMN IF NOT EXISTS lance_contemplado_percent NUMERIC(7,4)`
  );
  console.log('Colunas credito_min/credito_max/seguro_prestamista_percent/lance_contemplado_percent OK!');

  // ── Grupos Embracon (imóvel) ────────────────────────────────────────────────
  // Fonte de verdade dos 13 grupos, antes hardcoded em EmbraconSimulador.jsx.
  // taxa_adm 20%, fundo_reserva 2% e lance_embutido_max 25% são termos globais
  // do produto — iguais para todos os grupos. lance_embutido_max é fração
  // (0.25 = 25%), como no CNP. A Embracon informa apenas um prazo por grupo,
  // então prazo_total = prazo_restante. A taxa de adesão (1,2% diluída nas 12
  // primeiras parcelas) segue no frontend: vale para o produto, não por grupo.
  // O DO UPDATE é necessário para sobrescrever o 7036, que existia com zeros.
  const gruposEmbracon = [
    [7026, 250000, 500000, 96,  51.6096],
    [7027, 110000, 220000, 100, 54.2976],
    [7028, 50000,  100000, 100, 54.2976],
    [7030, 150000, 300000, 102, 55.3728],
    [7031, 250000, 500000, 105, 56.4480],
    [7032, 110000, 220000, 104, 56.4480],
    [7033, 50000,  100000, 106, 57.5232],
    [7034, 150000, 300000, 107, 57.5232],
    [7035, 150000, 300000, 108, 58.5984],
    [7036, 250000, 500000, 108, 58.5984],
    [7037, 50000,  100000, 106, 57.5232],
    [7038, 110000, 220000, 108, 58.0608],
    [7040, 80000,  160000, 109, 59.1360],
  ];
  for (const [grupo, credMin, credMax, prazo, lanceCont] of gruposEmbracon) {
    await db.query(
      `INSERT INTO simulador_grupos
         (numero_grupo, modalidade, taxa_adm, fundo_reserva, reajuste, mes_reajuste,
          lance_embutido_max, prazo_restante, prazo_total, administradora,
          sem_media_contemplacao, credito_min, credito_max, lance_contemplado_percent)
       VALUES
         ($1, 'imovel', 0.20, 0.02, 'INCC', 'JANEIRO', 0.25, $4, $4, 'EMBRACON',
          TRUE, $2, $3, $5)
       ON CONFLICT (numero_grupo, modalidade) DO UPDATE SET
         administradora            = 'EMBRACON',
         taxa_adm                  = EXCLUDED.taxa_adm,
         fundo_reserva             = EXCLUDED.fundo_reserva,
         lance_embutido_max        = EXCLUDED.lance_embutido_max,
         prazo_restante            = EXCLUDED.prazo_restante,
         prazo_total               = EXCLUDED.prazo_total,
         credito_min               = EXCLUDED.credito_min,
         credito_max               = EXCLUDED.credito_max,
         lance_contemplado_percent = EXCLUDED.lance_contemplado_percent`,
      [grupo, credMin, credMax, prazo, lanceCont]
    );
  }
  console.log(`simulador_grupos: ${gruposEmbracon.length} grupos Embracon OK!`);

  // ── FAQ de regras de administradoras ────────────────────────────────────────
  // Busca tolerante a acento e a maiúscula/minúscula: unaccent (remove acento) +
  // to_tsvector('portuguese') (lowercase + stemming). Coluna gerada exige função
  // IMMUTABLE, por isso o wrapper f_unaccent sobre a forma de 2 args do unaccent.
  await db.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  await db.query(`
    CREATE OR REPLACE FUNCTION f_unaccent(text)
    RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT public.unaccent('public.unaccent', $1) $$
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS faq_entradas (
      id SERIAL PRIMARY KEY,
      administradora TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      topico TEXT NOT NULL,
      texto TEXT NOT NULL,
      ordem INTEGER DEFAULT 0,
      criado_em TIMESTAMPTZ DEFAULT now(),
      criado_por TEXT,
      tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', f_unaccent(topico || ' ' || texto))) STORED
    )
  `);
  // Migra tabelas já existentes cuja tsv ainda não usa f_unaccent (sem acento-tolerância).
  await db.query(`
    DO $$
    DECLARE expr text;
    BEGIN
      SELECT generation_expression INTO expr
        FROM information_schema.columns
       WHERE table_name = 'faq_entradas' AND column_name = 'tsv';
      IF expr IS NULL OR position('f_unaccent' IN expr) = 0 THEN
        ALTER TABLE faq_entradas DROP COLUMN IF EXISTS tsv;
        ALTER TABLE faq_entradas ADD COLUMN tsv tsvector
          GENERATED ALWAYS AS (to_tsvector('portuguese', f_unaccent(topico || ' ' || texto))) STORED;
      END IF;
    END $$;
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_faq_entradas_tsv ON faq_entradas USING GIN (tsv)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_faq_entradas_adm ON faq_entradas (administradora)`);
  console.log('Tabela "faq_entradas" OK!');

  await db.query(`
    CREATE TABLE IF NOT EXISTS faq_perguntas_log (
      id SERIAL PRIMARY KEY,
      pergunta TEXT NOT NULL,
      resposta TEXT,
      administradora TEXT,
      email_usuario TEXT NOT NULL,
      encontrou_resposta BOOLEAN,
      entradas_recuperadas INTEGER,
      trechos_fonte JSONB,
      criado_em TIMESTAMPTZ DEFAULT now()
    )
  `);
  // Feedback opcional do usuário ("A dúvida foi sanada?"): null = não respondido.
  await db.query(`ALTER TABLE faq_perguntas_log ADD COLUMN IF NOT EXISTS duvida_sanada BOOLEAN`);
  console.log('Tabela "faq_perguntas_log" OK!');

  // Seed das 13 entradas CNP — idempotente (só insere se a administradora CNP
  // ainda não tiver entradas cadastradas).
  const { rows: faqCnp } = await db.query(
    `SELECT COUNT(*) FROM faq_entradas WHERE administradora = 'CNP'`
  );
  if (parseInt(faqCnp[0].count, 10) === 0) {
    await db.query(`
INSERT INTO faq_entradas (administradora, categoria, subcategoria, topico, texto, ordem) VALUES
('CNP', 'Imobiliário', 'Garantias', 'Garantias aceitas',
'Garantias aceitas no consórcio imobiliário: imóvel residencial ou comercial novo ou usado; imóvel misto (residência e comercial) na mesma matrícula; aquisição de terreno urbano; casa de praia; imóvel rural, com garantia obrigatória de um imóvel urbano quitado e livre de ônus (em nome do consorciado ou de terceiro); reforma e/ou ampliação de imóvel urbano próprio, residencial ou comercial; aquisição de imóvel residencial/comercial e terreno com saldo devedor de financiamento habitacional IQ; quitação de financiamento habitacional próprio; pagamento de 100% do valor do bem, sem deflator; possibilidade de aprovação de operações de levantamento de capital (compra x venda).',
1),
('CNP', 'Imobiliário', 'Construção', 'Modelo convencional',
'O modelo convencional cobre construção de imóvel residencial ou comercial em terreno urbano e término de construção já iniciada. Há duas modalidades. Postecipado: reembolso por medição de obra executada conforme cronograma, sendo 1ª etapa no máximo 20% e última etapa no mínimo 10% (quando o terreno não cobre o saldo devedor ou não há garantia complementar). Antecipado: apresentando garantia complementar urbana, valores liberados em 20%, 70% e 10%.',
1),
('CNP', 'Imobiliário', 'Construção', 'Contrato guarda-chuva',
'O contrato guarda-chuva é para operações acima de 2 milhões. Exige deixar um imóvel urbano que cubra o saldo devedor (pode ser de terceiros); o terreno onde será construído tem que estar quitado e no nome do consorciado; não pode usar FGTS nesta operação. Após contemplação de no mínimo 20% do valor destinado à construção prevista no cronograma físico/financeiro, é possível reunir todas as cotas: liberam-se os primeiros 20%, depois 70% (liberado conforme as contemplações avançam) e os 10% restantes são reembolsados após a regularização do imóvel (pagamento das custas).',
2),
('CNP', 'Imobiliário', 'Construção', 'Compra de terreno + construção',
'Na operação de compra de terreno mais construção (apenas urbano): exige deixar um imóvel urbano que cubra o saldo devedor (pode ser de terceiros); não pode usar contrato guarda-chuva (se houver mais de uma cota na operação, todas devem estar contempladas); o terreno a ser comprado tem que estar quitado; não pode usar FGTS nesta operação.',
3),
('CNP', 'Imobiliário', 'Construção', 'Compra de imóvel + reforma',
'Na operação de compra de imóvel mais reforma (apenas urbano): exige deixar um imóvel urbano que cubra o saldo devedor (pode ser de terceiros); não pode usar contrato guarda-chuva (se houver mais de uma cota na operação, todas devem estar contempladas); o imóvel a ser comprado tem que estar quitado; a reforma é limitada a 50% do valor do imóvel, com recurso liberado em 20%-70%-10%; não pode usar FGTS nesta operação.',
4),
('CNP', 'Automóvel', 'Bens aceitos', 'Veículos leves',
'No consórcio de veículos leves são aceitos: veículos novos ou usados com até 8 anos de fabricação; quitação de financiamento próprio, exceto leasing (desde que a financeira dê baixa no gravame para a CNP realizar a alienação do veículo antes do pagamento); automóvel, utilitário, caminhonete e camioneta ou SUV com peso bruto total (PBT) inferior ou igual a 3.500 kg; motocicleta a partir de 450 cilindradas; motocicleta abaixo de 450 cilindradas, que poderá exigir garantia complementar; embarcações (necessário documento da Capitania dos Portos para alienação e pagamento) ou garantia substitutiva, com veículo de até 8 anos de fabricação; máquinas e equipamentos, que poderão exigir garantia complementar (exemplo: aquisição de drones).',
1),
('CNP', 'Automóvel', 'Bens aceitos', 'Veículos pesados',
'No consórcio de veículos pesados são aceitos: ônibus, micro-ônibus, caminhão, caminhão-trator, trator de rodas, trator misto, chassi-plataforma, motor-casa, guincho, reboque ou semirreboque e suas combinações; implementos agrícolas (colheitadeira, plantadeira e acoplados, roçadeiras, grades aradoras e niveladoras de solo, entre outros); construção civil (escavadeira, retroescavadeira, guindaste, caçamba e empilhadeira); produtos de linha verde (placas fotovoltaicas, geradores de energia). Esses três últimos grupos (implementos agrícolas, construção civil e linha verde) só podem ser adquiridos quando novos, exigem apresentação de garantia complementar ao saldo devedor, podendo ser veículo de até 8 anos de fabricação ou fiador aprovado em análise cadastral. Embarcações e aeronaves: todos os tipos, novos ou usados, com até 8 anos de fabricação, podendo ser exigida garantia substitutiva.',
2),
('CNP', 'Parcela Reduzida', NULL, 'Parcela reduzida',
'Parcela reduzida: lance fixo de 20% ou 30% do saldo devedor; lance embutido de 30% e 50% do valor do crédito; opções de redutor de 25% e de 50%; disponível para grupos de imóveis, veículos leves e pesados; sem taxa de adesão. Regras: as parcelas ficam mais baixas até a contemplação ou até a metade do prazo original do grupo. Após a contratação, não é possível alterar o plano de vendas (trocar de parcela reduzida para integral, ou vice-versa). Grupos híbridos permitem contratação com redutor de 50%, 25% ou parcela integral, o que favorece a composição do fundo comum do grupo.',
1),
('CNP', 'Política de Crédito', NULL, 'Faixas de valor',
'Faixas da política de crédito: até R$ 3 milhões de crédito contratado (padrão), liberado direto na plataforma de vendas, sem análise prévia, contratação simplificada. Entre R$ 3 milhões e R$ 5 milhões, exclusivo para imóveis, liberado na plataforma com pedido prévio de até 24h. Até R$ 10 milhões de saldo devedor, exige análise prévia de risco e crédito (alçada da administradora, SLA 5 dias úteis), com preenchimento de FOP, checklist de documentos e proposta estruturada para analisar projeção de parcela e saldo devedor pós-contemplação; PF: parcela até 30% da renda mensal, PJ: parcela até 10% do faturamento mensal. Acima de R$ 10 milhões até R$ 30 milhões de saldo devedor, exige análise prévia de risco e crédito e análise da resseguradora IRB (SLA 15 dias úteis).',
1),
('CNP', 'Política de Crédito', NULL, 'Holding patrimonial',
'Na análise de limite de crédito de holding patrimonial: o CPF de um dos sócios pode usar sua comprovação de renda; não pode somar renda (seguindo os documentos oficiais aceitos: holerite, imposto de renda, posição consolidada na XP); o sócio garantidor não pode ser o vendedor do imóvel.',
2),
('CNP', 'Política de Crédito', NULL, 'Grupo econômico',
'Para grupo econômico: o CNPJ do grupo econômico pode comprovar renda (seguindo os documentos oficiais aceitos); os sócios têm que ser residentes no Brasil; a empresa garantidora não pode ser a vendedora do imóvel.',
3),
('CNP', 'Rentabilidade', NULL, 'Rendimento do crédito contemplado (fundo x CDI)',
'O crédito contemplado do consórcio fica aplicado no fundo SAFRA SOBERANO (renda fixa referenciada ao CDI), então acompanha o CDI enquanto não é utilizado. Referência dezembro/2025: a carteira rendeu 97,12% do CDI nos últimos 12 meses (13,91% da carteira contra 14,32% do CDI), 95,67% em 6 meses e 93,38% no mês. Exemplo de simulação com crédito contemplado de R$ 1.000.000,00, aplicando 97,12% do CDI: valor futuro em 12 meses de R$ 1.139.075,84, rentabilidade de R$ 139.075,84. A exposição de risco segue a norma BACEN 3432. (Dados de referência de dez/2025; atualizar periodicamente.)',
1),
('CNP', 'Índices de reajuste', NULL, 'Comparativo INPC x INCC',
'O consórcio CNP é reajustado pelo INPC, enquanto muitos financiamentos e outros consórcios usam o INCC (Índice Nacional de Custo da Construção Civil), que é bem mais agressivo e historicamente mais alto, o que torna o reajuste pelo INPC uma vantagem para o consorciado. Referência 2025: o INPC acumulou 3,90% contra 5,94% do INCC, diferença de -34,34% a favor do INPC. Em 2024 a diferença já existia: INPC 4,77% contra INCC 6,54% (-27,06%). Ao longo de dez/2024 a dez/2025, o INPC em 12 meses ficou consistentemente abaixo do INCC-M. (Dados de referência até dez/2025; atualizar periodicamente.)',
1)
    `);
    console.log('Seed FAQ CNP: 13 entradas inseridas!');
  } else {
    console.log('FAQ CNP já populado, pulando seed.');
  }

  console.log('Migração concluída!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
  });
}
