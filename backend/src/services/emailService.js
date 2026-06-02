const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// contexto: 'redefinicao' (padrão, usuário pediu), 'novo' (conta recém-criada), 'reset' (admin resetou)
async function enviarEmailRedefinicaoSenha(destinatario, nomeUsuario, linkRedefinicao, opts = {}) {
  const contexto = opts.contexto || 'redefinicao';
  const validadeTexto = opts.validadeTexto || '1 hora';

  const textos = {
    redefinicao: {
      subject: 'Redefinição de senha — Dashboard',
      intro: 'Recebemos uma solicitação para redefinir sua senha.',
      acao: 'Clique no botão abaixo para criar uma nova senha.',
      botao: 'Redefinir senha',
      rodape: 'Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.',
    },
    novo: {
      subject: 'Bem-vindo ao Dashboard — defina sua senha',
      intro: 'Sua conta de acesso ao Dashboard foi criada.',
      acao: 'Clique no botão abaixo para definir sua senha e acessar o sistema.',
      botao: 'Definir senha',
      rodape: 'Se você não esperava este e-mail, pode ignorá-lo.',
    },
    reset: {
      subject: 'Acesso redefinido — Dashboard',
      intro: 'Um administrador redefiniu o acesso da sua conta.',
      acao: 'Clique no botão abaixo para criar uma nova senha.',
      botao: 'Criar nova senha',
      rodape: 'Se você não esperava este e-mail, fale com o administrador.',
    },
  };
  const t = textos[contexto] || textos.redefinicao;

  const { error } = await resend.emails.send({
    from: 'Dashboard <noreply@jtdkinvest.com>',
    to: destinatario,
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1d1d1f;">Olá, ${nomeUsuario}</h2>
        <p style="color: #555;">${t.intro}</p>
        <p style="color: #555;">${t.acao} O link expira em <strong>${validadeTexto}</strong>.</p>
        <a href="${linkRedefinicao}" style="display:inline-block; margin: 24px 0; padding: 12px 28px; background: #f5c000; color: #1d1d1f; text-decoration: none; border-radius: 10px; font-weight: 600;">
          ${t.botao}
        </a>
        <p style="color: #999; font-size: 13px;">${t.rodape}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #bbb; font-size: 12px;">Dashboard · jtdkinvest.com</p>
      </div>
    `,
  });
  if (error) throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
}

module.exports = { enviarEmailRedefinicaoSenha };
