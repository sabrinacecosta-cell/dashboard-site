// One-off: cria as tabelas do FAQ e semeia as 13 entradas CNP.
// A mesma lógica está em migrate.js (roda em todo boot); este script permite
// aplicar de imediato contra produção sem rodar a migração inteira.
//   DATABASE_PUBLIC_URL=... NODE_ENV=production node scripts/seed_faq.js
require('dotenv').config();
const db = require('../src/config/database');

async function seedFaq() {
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
      tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', topico || ' ' || texto)) STORED
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_faq_entradas_tsv ON faq_entradas USING GIN (tsv)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_faq_entradas_adm ON faq_entradas (administradora)`);
  console.log('faq_entradas OK');

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
  console.log('faq_perguntas_log OK');

  const { rows } = await db.query(`SELECT COUNT(*) FROM faq_entradas WHERE administradora = 'CNP'`);
  if (parseInt(rows[0].count, 10) > 0) {
    console.log('FAQ CNP já populado, pulando seed.');
    return;
  }

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
}

seedFaq()
  .then(() => { console.log('Concluído.'); process.exit(0); })
  .catch((err) => { console.error('Erro:', err); process.exit(1); });
