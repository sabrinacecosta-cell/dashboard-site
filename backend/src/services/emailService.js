const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarEmailRedefinicaoSenha(destinatario, nomeUsuario, linkRedefinicao) {
  const { error } = await resend.emails.send({
    from: 'Dashboard <noreply@jtdkinvest.com>',
    to: destinatario,
    subject: 'Redefinição de senha — Dashboard',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1d1d1f;">Olá, ${nomeUsuario}</h2>
        <p style="color: #555;">Recebemos uma solicitação para redefinir sua senha.</p>
        <p style="color: #555;">Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
        <a href="${linkRedefinicao}" style="display:inline-block; margin: 24px 0; padding: 12px 28px; background: #f5c000; color: #1d1d1f; text-decoration: none; border-radius: 10px; font-weight: 600;">
          Redefinir senha
        </a>
        <p style="color: #999; font-size: 13px;">Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #bbb; font-size: 12px;">Dashboard · jtdkinvest.com</p>
      </div>
    `,
  });
  if (error) throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
}

module.exports = { enviarEmailRedefinicaoSenha };
