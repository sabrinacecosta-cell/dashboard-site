const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const { ACOMPANHAMENTO } = require('../data/mockData');

const router = express.Router();

// Quem pode importar cotas (mesmos e-mails que enxergam a aba)
const EMAILS_IMPORT = ['sabrina@jtdkinvest.com', 'joaomatheus_heckler@outlook.com'];

router.get('/acompanhamento', authMiddleware, async (req, res) => {
  if (req.isDemo) return res.json(ACOMPANHAMENTO);
  try {
    const result = await db.query(
      'SELECT * FROM acompanhamento ORDER BY cliente_nome, grupo, cota'
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// ── Helpers de normalização ─────────────────────────────────
const str = (v) => (v === undefined || v === null || v === '') ? null : String(v).trim();
const intOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};
// Aceita número (175448.12) ou string BR ("175.448,12")
const numOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/[R$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // formato BR
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
};
const normGrupo = (v) => {
  const d = String(v ?? '').replace(/\D/g, '');
  return d ? d.padStart(6, '0') : null;      // "1001" -> "001001"
};
const normCota = (v) => {
  let d = String(v ?? '').replace(/-00\b/, '').replace(/\D/g, '');
  return d ? d.padStart(4, '0') : null;       // "163" / "0163-00" -> "0163"
};

// Importar cotas de clientes (upsert por cpf+grupo+cota — não duplica)
router.post('/acompanhamento/importar', authMiddleware, async (req, res) => {
  if (req.isDemo) return res.status(403).json({ error: 'Indisponível no modo demonstração' });
  if (!EMAILS_IMPORT.includes(String(req.userEmail || '').toLowerCase())) {
    return res.status(403).json({ error: 'Sem permissão para importar' });
  }

  const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : [];
  if (!linhas.length) return res.status(400).json({ error: 'Nenhuma linha recebida' });

  let inseridos = 0, atualizados = 0, ignorados = 0;
  const erros = [];

  try {
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      const nome  = str(l.cliente_nome);
      const cpf   = str(l.cliente_cpf);
      const grupo = normGrupo(l.grupo);
      const cota  = normCota(l.cota);

      if (!nome || !grupo || !cota) { ignorados++; continue; }

      const vals = {
        contrato:            str(l.contrato),
        data_venda:          str(l.data_venda),
        prazo_grupo:         intOrNull(l.prazo_grupo),
        taxa_adm:            str(l.taxa_adm),
        proximo_reajuste:    str(l.proximo_reajuste),
        parcelas_pagas:      intOrNull(l.parcelas_pagas),
        soma_parcelas_pagas: numOrNull(l.soma_parcelas_pagas),
        prazo_restante:      intOrNull(l.prazo_restante),
        saldo_devedor:       numOrNull(l.saldo_devedor),
      };

      // (grupo, cota) identifica a cota unicamente — dedup robusto a variação de CPF
      const ex = await db.query(
        'SELECT id FROM acompanhamento WHERE grupo = $1 AND cota = $2',
        [grupo, cota]
      );

      if (ex.rowCount > 0) {
        await db.query(
          `UPDATE acompanhamento SET
             cliente_nome=$1, cliente_cpf=$2, contrato=$3, data_venda=$4, prazo_grupo=$5, taxa_adm=$6,
             proximo_reajuste=$7, parcelas_pagas=$8, soma_parcelas_pagas=$9,
             prazo_restante=$10, saldo_devedor=$11
           WHERE id=$12`,
          [nome, cpf, vals.contrato, vals.data_venda, vals.prazo_grupo, vals.taxa_adm,
           vals.proximo_reajuste, vals.parcelas_pagas, vals.soma_parcelas_pagas,
           vals.prazo_restante, vals.saldo_devedor, ex.rows[0].id]
        );
        atualizados++;
      } else {
        await db.query(
          `INSERT INTO acompanhamento
             (cliente_nome,cliente_cpf,grupo,cota,contrato,data_venda,prazo_grupo,taxa_adm,
              proximo_reajuste,parcelas_pagas,soma_parcelas_pagas,prazo_restante,saldo_devedor)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [nome, cpf, grupo, cota, vals.contrato, vals.data_venda, vals.prazo_grupo, vals.taxa_adm,
           vals.proximo_reajuste, vals.parcelas_pagas, vals.soma_parcelas_pagas,
           vals.prazo_restante, vals.saldo_devedor]
        );
        inseridos++;
      }
    }
    return res.json({ inseridos, atualizados, ignorados, total: linhas.length, erros });
  } catch (error) {
    console.error('acompanhamento/importar:', error.message);
    return res.status(500).json({ error: 'Erro ao importar: ' + error.message });
  }
});

module.exports = router;
