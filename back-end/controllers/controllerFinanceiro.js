// back-end/controllers/controllerFinanceiro.js

const db = require('../database/db');
const { getAtendente } = require('../services/atendimentoService');
const oracledb = require('oracledb');
const flowControl = require('../flowcontrol');

async function iniciar(client, msg) {
  const userId = msg.author || msg.from;
  const menu = `*Financeiro*\n1️⃣ Segunda via de fatura\n2️⃣ Renegociar fatura\n3️⃣ Falar com atendente`;
  await msg.reply(menu);
  await flowControl.setStep(userId, 'financeiro_menu');
}


async function continuar(client, msg) {
  const userId = msg.author || msg.from;
  const opt = msg.body.trim();

  const etapa = await flowControl.getStep(userId);
  console.log(`[Financeiro] Etapa atual do usuário ${userId}: ${etapa}`);
  console.log(`[Financeiro] Opção recebida: ${opt}`);
  
  if (opt === '1') {
    await msg.reply('Digite o número da sua Nota Fiscal:');
    await flowControl.setStep(userId, 'financeiro_aguardando_nf');
    return;
  }

  if (opt === '2' || opt === '3') {
    console.log('[Financeiro] Usuário escolheu redirecionamento:', opt);
    await flowControl.clearStep(userId);
    return redirecionarAtendente(client, msg, 'financeiro');
  }

  await msg.reply('❌ Opção inválida. Digite *Financeiro* para tentar novamente.');
}


async function processarNF(client, msg) {
  const userId = msg.author || msg.from;
  const nf = msg.body.trim();
  const qr = await db.query(
    `SELECT TL.TITL_NUMERO, TL.TITL_VALOR, TL.TITL_POSICAO, TL.TITL_DT_VENCTO
        FROM MOVIMENTO_ESTOQUE ME
        JOIN RELAC_MVES_FTRA RFTRA ON RFTRA.MOVIMENTO_ESTOQUE_ID = ME.MOVIMENTO_ESTOQUE_ID
        JOIN FATURA FT ON FT.FATURA_ID = RFTRA.FATURA_ID
        JOIN TITULO TL ON TL.FATURA_ID = FT.FATURA_ID
      WHERE ME.MOVI_NR_NOTA_FISCAL = :nf
        AND TL.TITL_POSICAO = 'Aberto'`,
         [nf], { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (qr.rows && qr.rows.length) {
    const cod = qr.rows[0].COD_BARRAS || 'código não encontrado';
    await msg.reply(`📄 Segunda via da fatura (NF ${nf}):\nCódigo de barras:\n${cod}`);
    await msg.reply('✅ Caso precise de renegociar ou falar com um atendente, digite *2* ou *3* no menu.');
  } else {
    await msg.reply(`❌ NF ${nf} não encontrada. Digite *Financeiro* para tentar novamente ou *3* para atendimento.`);
  }

  await flowControl.clearStep(userId);
}


async function redirecionarAtendente(client, msg, setor) {
  const tel = await getAtendente(setor);
  if (!tel) {
    await client.sendMessage(msg.from, '❌ Nenhum atendente disponível no momento.');
    return;
  }

  const link = `https://wa.me/55${tel}?text=${encodeURIComponent('Oi, preciso de ajuda com o financeiro')}`;
  await client.sendMessage(msg.from, `📞 Atendimento disponível: ${link}`);
}

module.exports = {
  iniciar,
  continuar,
  processarNF
};

