const db = require('../database/db');
const { getAtendente } = require('../services/atendimentoService');
const oracledb = require('oracledb');

async function iniciar(client, msg) {
  const menu = `*Financeiro*\n1️⃣ Segunda via de fatura\n2️⃣ Renegociar fatura\n3️⃣ Falar com atendente`;
  await msg.reply(menu);

  const filter = m => m.from === msg.from;
  const resp = await client.waitForMessage(filter);
  const opt = resp.body.trim();

  if (opt === '1') {
    await msg.reply('Digite o número da sua Nota Fiscal:');
    const nfMsg = await client.waitForMessage(filter);
    return enviarSegundaVia(client, msg, nfMsg.body.trim());
  }

  if (opt === '2') return redirecionarAtendente(client, msg, 'financeiro');
  if (opt === '3') return redirecionarAtendente(client, msg, 'financeiro');

  await msg.reply('Opção inválida. Volte ao menu digitando *Financeiro*.');
}

async function enviarSegundaVia(client, msg, nf) {
  const qr = await db.query(
    `
      select TL.TITL_NUMERO ,TL.TITL_VALOR, TL.TITL_POSICAO, TL.TITL_DT_VENCTO
        from MOVIMENTO_ESTOQUE ME, 
            RELAC_MVES_FTRA RFTRA, 
            FATURA FT,
            TITULO TL
      where ME.MOVI_NR_NOTA_FISCAL     = :nf
        and RFTRA.MOVIMENTO_ESTOQUE_ID = ME.MOVIMENTO_ESTOQUE_ID
        and FT.FATURA_ID               = RFTRA.FATURA_ID
        and TL.FATURA_ID               = FT.FATURA_ID
        and TL.TITL_POSICAO            = 'Aberto'  
   `,
    [nf],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  if (qr.rows && qr.rows.length) {
    const cod = qr.rows[0].COD_BARRAS;
    await msg.reply(`📄 Segunda via da fatura (NF ${nf}):\nCódigo de barras:\n${cod}`);
    await msg.reply('✅ Caso precise de renegociar ou falar com um atendente, digite *2* ou *3* no menu.');
  } else {
    await msg.reply(`❌ NF ${nf} não encontrada. Digite *Financeiro* para tentar novamente ou *3* para atendimento.`);

  }
}

// Exemplo guardado copiar de controllerPedido
async function redirecionarAtendente(client, msg, setor) {
  const tel = await getAtendente(setor);
  if (!tel) return msg.reply('Desculpa, não achei um atendente agora.');
  await msg.reply(`Atendimento financeiro disponível: https://wa.me/55${tel}?text=${encodeURIComponent('Oi, preciso de ajuda com o financeiro')}`);
}

module.exports = { iniciar };
