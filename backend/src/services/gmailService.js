const { google } = require('googleapis');
const { oauth2Client } = require('../config/google');

// Extrai texto plano do payload MIME (recursivo para multipart)
function extractBody(payload) {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    // fallback: HTML
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return '';
}

function extractEventTitle(subject) {
  const match = subject.match(/(?:Notas da reuni[aã]o|Meeting notes|Resumo da reuni[aã]o|Anota[cç][oõ]es):\s*(.+)/i);
  return match ? match[1].trim() : subject;
}

// Busca e-mails do Gemini/Meet com atas de reunião dos últimos 90 dias
async function searchMeetingEmails() {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Query corrigida: OR apenas entre os subjects, newer_than aplicado a todos
  const query = '(subject:"Notas da reunião" OR subject:"Meeting notes" OR subject:"Resumo da reunião" OR subject:"Anotações:") newer_than:90d';
  console.log('[gmailService] query:', query);

  let listRes;
  try {
    listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
    });
  } catch (listErr) {
    console.error('[gmailService] ERRO ao listar mensagens:', listErr.message);
    console.error('[gmailService] code:', listErr.code, 'status:', listErr.status);
    throw listErr;
  }

  const messages = listRes.data.messages || [];
  console.log('[gmailService] mensagens encontradas pela query:', messages.length);

  // Testa também query alternativa sem filtro de remetente para diagnóstico
  if (messages.length === 0) {
    console.log('[gmailService] AVISO: 0 mensagens. Testando query ampla para diagnóstico...');
    try {
      const altRes = await gmail.users.messages.list({
        userId: 'me',
        q: 'subject:"reunião" newer_than:90d',
        maxResults: 5,
      });
      console.log('[gmailService] query ampla "reunião" retornou:', (altRes.data.messages || []).length, 'mensagens');
    } catch (altErr) {
      console.error('[gmailService] query ampla também falhou:', altErr.message);
    }
  }

  const results = [];

  for (const msg of messages) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = full.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const dateStr = headers.find(h => h.name === 'Date')?.value || '';

      const body = extractBody(full.data.payload);
      console.log('[gmailService] e-mail lido:', subject, '| body length:', body.length);

      results.push({
        messageId: msg.id,
        subject,
        date: dateStr ? new Date(dateStr) : new Date(),
        body,
        eventTitle: extractEventTitle(subject),
      });
    } catch (e) {
      console.error('[gmailService] erro ao ler mensagem', msg.id, ':', e.message);
    }
  }

  return results;
}

// Extrai itens de ação do corpo do e-mail
function extractActionItems(body) {
  const markers = [
    'itens de ação',
    'action items',
    'ações',
    'próximos passos',
    'next steps',
    'tarefas',
  ];

  const lines = body.split('\n');
  let inSection = false;
  const items = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (markers.some(m => lower.includes(m))) {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (!trimmed) continue;

      // Parar se encontrar outra seção (linha com ":" no final ou toda maiúscula)
      if (/^[A-ZÁÉÍÓÚ][^:]{3,}:$/.test(trimmed)) break;

      // Captura bullet points ou linhas numeradas
      if (/^[•\-\*▪→]/.test(trimmed) || /^\d+[\.\)]/.test(trimmed)) {
        const clean = trimmed.replace(/^[•\-\*▪→\d\.\)]+\s*/, '').trim();
        if (clean) items.push(clean);
      }
    }
  }

  return items;
}

module.exports = { searchMeetingEmails, extractActionItems };
