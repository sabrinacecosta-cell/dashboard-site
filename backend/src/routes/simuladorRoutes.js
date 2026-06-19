const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/grupos', authMiddleware, async (req, res) => {
  const { modalidade } = req.query;
  if (!modalidade || !['imovel', 'auto'].includes(modalidade))
    return res.status(400).json({ error: 'modalidade inválida. Use imovel ou auto.' });

  const ctable = modalidade === 'auto' ? 'contemplacao_auto' : 'contemplacao';

  const orderExpr = `
    CASE
      WHEN mes NOT LIKE '%/%' THEN
        CASE LOWER(mes)
          WHEN 'abril' THEN 1 WHEN 'maio' THEN 2 WHEN 'junho' THEN 3
          WHEN 'julho' THEN 4 WHEN 'agosto' THEN 5 WHEN 'setembro' THEN 6
          WHEN 'outubro' THEN 7 WHEN 'novembro' THEN 8 WHEN 'dezembro' THEN 9
          WHEN 'janeiro' THEN 10 WHEN 'fevereiro' THEN 11 WHEN 'março' THEN 12
          ELSE 99
        END
      ELSE
        (CAST(SPLIT_PART(mes,'/',2) AS INTEGER) - 2024) * 12 +
        CASE LOWER(SPLIT_PART(mes,'/',1))
          WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
          WHEN 'abril' THEN 4 WHEN 'maio' THEN 5 WHEN 'junho' THEN 6
          WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8 WHEN 'setembro' THEN 9
          WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11 WHEN 'dezembro' THEN 12
          ELSE 0
        END + 100
    END DESC`;

  try {
    const result = await db.query(
      `SELECT
        sg.*,
        (
          SELECT lance_percent
          FROM ${ctable}
          WHERE grupo = sg.numero_grupo
          ORDER BY ${orderExpr}
          LIMIT 1
        ) AS lance_ultimo_mes
      FROM simulador_grupos sg
      WHERE sg.modalidade = $1
        AND sg.id = (SELECT MIN(id) FROM simulador_grupos WHERE numero_grupo = sg.numero_grupo AND modalidade = sg.modalidade)
      ORDER BY sg.numero_grupo ASC`,
      [modalidade]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/cotas', authMiddleware, async (req, res) => {
  const { grupo, modalidade } = req.query;
  if (!grupo || !modalidade)
    return res.status(400).json({ error: 'grupo e modalidade são obrigatórios' });
  if (!['imovel', 'auto'].includes(modalidade))
    return res.status(400).json({ error: 'modalidade inválida. Use imovel ou auto.' });

  try {
    const result = await db.query(
      `SELECT * FROM simulador_cotas
       WHERE numero_grupo = $1 AND modalidade = $2
       ORDER BY bem_referencia ASC, redutor_parcela ASC`,
      [parseInt(grupo), modalidade]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Grupos com campanha de redutor ativa em junho/2026
const GRUPOS_REDUTOR_ATIVO = {
  imovel: [1038, 1042, 1043, 1044, 1047, 1048, 1050, 1053, 1054, 1055],
  auto:   [2130, 3002],
};

// Modo Multiplicador: monta um portfólio dividindo o crédito desejado entre
// grupos para diversificar/acelerar a contemplação.
router.get('/multiplicador', authMiddleware, async (req, res) => {
  const { modalidade } = req.query;
  const credito   = parseFloat(req.query.credito);

  if (!modalidade || !['imovel', 'auto'].includes(modalidade))
    return res.status(400).json({ error: 'modalidade inválida. Use imovel ou auto.' });
  if (!Number.isFinite(credito) || credito <= 0)
    return res.status(400).json({ error: 'credito deve ser um número maior que zero.' });

  const ctable = modalidade === 'auto' ? 'contemplacao_auto' : 'contemplacao';
  const redutorAtivo = GRUPOS_REDUTOR_ATIVO[modalidade] || [];

  try {
    // 1. Grupos ativos da modalidade (deduplicados por numero_grupo)
    const gruposRes = await db.query(
      `SELECT sg.* FROM simulador_grupos sg
       WHERE sg.modalidade = $1
         AND sg.id = (SELECT MIN(id) FROM simulador_grupos
                      WHERE numero_grupo = sg.numero_grupo AND modalidade = sg.modalidade)
       ORDER BY sg.numero_grupo ASC`,
      [modalidade]
    );

    const candidatos = [];
    for (const g of gruposRes.rows) {
      // Usa a média de contemplação CURADA de simulador_grupos (autoritativa,
      // a mesma exibida nas Métricas). Não recalcular da tabela bruta — os
      // valores ali foram corrigidos no migrate e divergem do SUM/SUM bruto.
      if (g.sem_media_contemplacao) continue;       // grupo sem média confiável: excluir
      const P = parseFloat(g.media_contemplacao);
      if (!(P > 0)) continue;                       // sem média: não há tempo estimável

      // Tamanho da amostra (só para o badge de "média estimada")
      const cont = await db.query(
        `SELECT COUNT(*) AS n FROM ${ctable} WHERE grupo = $1`,
        [g.numero_grupo]
      );
      const n = parseInt(cont.rows[0].n);

      // Cotas do grupo
      const cotasRes = await db.query(
        `SELECT cota, parcela, redutor_parcela FROM simulador_cotas
         WHERE numero_grupo = $1 AND modalidade = $2
         ORDER BY cota DESC`,
        [g.numero_grupo, modalidade]
      );
      const cotas = cotasRes.rows;
      if (!cotas.length) continue;

      // Regra de redutor: usa cota com redutor 0.5 só se o grupo está na campanha
      const temRedutor   = cotas.some(c => parseFloat(c.redutor_parcela) === 0.5);
      const usarRedutor  = temRedutor && redutorAtivo.includes(g.numero_grupo);
      const filtroRedutor = usarRedutor ? 0.5 : 0;
      const cotasFiltro = cotas.filter(c => parseFloat(c.redutor_parcela) === filtroRedutor);
      if (!cotasFiltro.length) continue;

      // Maior cota do grupo (cota DESC -> primeira)
      const cotaEscolhida = cotasFiltro[0];
      const cotaUnitaria  = parseFloat(cotaEscolhida.cota);
      const parcelaUnit   = parseFloat(cotaEscolhida.parcela);
      const lanceMax      = parseFloat(g.lance_embutido_max); // ex.: 0.50
      const liquidoPorCota = cotaUnitaria * (1 - lanceMax);
      if (!(liquidoPorCota > 0)) continue;

      candidatos.push({
        numero_grupo:   g.numero_grupo,
        P,
        media_estimada: n < 6,
        meses_amostra:  n,
        com_redutor:    usarRedutor,
        cota_unitaria:  cotaUnitaria,
        parcela_unit:   parcelaUnit,
        lance_max:      lanceMax,
        liquido_por_cota: liquidoPorCota,
        qtde: 0,
      });
    }

    if (!candidatos.length)
      return res.status(404).json({ error: 'Nenhum grupo elegível para a modalidade informada.' });

    // 2/3. Alocar cotas concentrando nos grupos com melhor média (maior P).
    // A cada passo adiciona a cota ao grupo de menor "custo" = (N+1)/P. Abrir
    // um grupo ainda vazio recebe uma penalidade (CONCENTRACAO_FATOR), o que
    // mantém as cotas concentradas nos melhores grupos e só abre novos grupos
    // quando a média do melhor já não compensa — algo que acontece naturalmente
    // quanto maior for o crédito. Acumula até cobrir o crédito (arredonda p/ cima).
    const CONCENTRACAO_FATOR = 2; // quão saturado um grupo fica antes de abrir o próximo
    candidatos.sort((a, b) => b.P - a.P); // melhor média primeiro (desempate)
    let liquidoTotal = 0;
    let guard = 0;
    const GUARD_MAX = 100000;
    while (liquidoTotal < credito && guard < GUARD_MAX) {
      let alvo = candidatos[0];
      let melhorCusto = Infinity;
      for (const c of candidatos) {
        const penalidade = c.qtde === 0 ? CONCENTRACAO_FATOR : 1;
        const custo = ((c.qtde + 1) / c.P) * penalidade;
        if (custo < melhorCusto) { melhorCusto = custo; alvo = c; }
      }
      alvo.qtde += 1;
      liquidoTotal += alvo.liquido_por_cota;
      guard += 1;
    }

    // 4/5. Monta a cesta apenas com grupos que receberam cotas
    let cesta = candidatos.filter(c => c.qtde > 0).map(c => {
      const creditoContratado = c.cota_unitaria * c.qtde;
      const creditoLiquido    = creditoContratado * (1 - c.lance_max);
      return {
        grupo:               c.numero_grupo,
        qtde_cotas:          c.qtde,
        cota_unitaria:       round2(c.cota_unitaria),
        credito_contratado:  round2(creditoContratado),
        credito_liquido:     round2(creditoLiquido),
        lance_embutido_max_pct: Math.round(c.lance_max * 100),
        parcela_unitaria:    round2(c.parcela_unit),
        parcela_total_grupo: round2(c.parcela_unit * c.qtde),
        com_redutor:         c.com_redutor,
        media_contemplacao:  Number(c.P.toFixed(6)),
        media_estimada:      c.media_estimada,
        meses_amostra:       c.meses_amostra,
        tempo_esperado_meses: round2(c.qtde / c.P),
        _P:                  c.P,
      };
    });

    // Sempre prioriza os grupos com as maiores médias de contemplação (maior P primeiro).
    // Tempo reportado = tempo do portfólio completo (MAX por grupo).
    cesta.sort((a, b) => b._P - a._P);
    const tempoReportado = round2(Math.max(...cesta.map(c => c.tempo_esperado_meses)));
    cesta = cesta.map(({ _P, ...rest }) => rest);

    const creditoLiquidoTotal    = cesta.reduce((s, c) => s + c.credito_liquido, 0);
    const creditoContratadoTotal = cesta.reduce((s, c) => s + c.credito_contratado, 0);
    const parcelaTotal           = cesta.reduce((s, c) => s + c.parcela_total_grupo, 0);

    return res.json({
      credito_desejado:         round2(credito),
      credito_liquido_total:    round2(creditoLiquidoTotal),
      credito_contratado_total: round2(creditoContratadoTotal),
      parcela_total:            round2(parcelaTotal),
      tempo_esperado_meses:     tempoReportado,
      cesta,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }

module.exports = router;
