// back-end/controllers/controllerFinanceiro.js

const db = require('../database/db');
const { getAtendente } = require('../services/atendimentoService');
const oracledb = require('oracledb');
const flowControl = require('../flowcontrol');
const { gerarBoletoPDF } = require('../utils/pdfBoleto'); // ajuste o caminho conforme onde você salvou a função
const fs = require('fs');
const { MessageMedia } = require('whatsapp-web.js');


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
  //console.log(`[Financeiro] Etapa atual do usuário ${userId}: ${etapa}`);
  //console.log(`[Financeiro] Opção recebida: ${opt}`);
  if (etapa === 'financeiro_pos_boleto') {
    if (opt === '2') {
      await flowControl.clearStep(userId);
      return redirecionarAtendente(client, msg, 'financeiro');
    } else {
      await msg.reply('❌ Opção inválida. Digite *2* para renegociar ou para falar com atendente.');
      return;
    }
  }
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
  //const nf = msg.body.trim();
  const nf = parseInt(msg.body.trim());
  const qr = await db.query(
    `SELECT TL.TITL_NUMERO, TL.TITL_VALOR, TL.TITL_POSICAO, TL.TITL_DT_VENCTO,
            TL.TITULO_ID,TL.CARTEIRA_BANCARIA_ID, ME.UNIDADE_EMPRESARIAL_ID,
            PC.PRCR_NOME, PC.PRCR_CGC_CPF,
            UNEM.PRCR_NOME NOME_EMPRESA,
            UNEM.PRCR_CGC_CPF  CNPJ_EMPRESA
        FROM MOVIMENTO_ESTOQUE ME,
             RELAC_MVES_FTRA RFTRA, 
             FATURA FT,    
             TITULO TL,
             PARCEIRO PC,
             PARCEIRO UNEM 
      WHERE ME.MOVI_NR_NOTA_FISCAL = :nf
        AND TL.TITL_POSICAO  = 'Aberto'
        AND RFTRA.MOVIMENTO_ESTOQUE_ID = ME.MOVIMENTO_ESTOQUE_ID
        AND FT.FATURA_ID     = RFTRA.FATURA_ID
        AND TL.FATURA_ID     = FT.FATURA_ID
        AND PC.PARCEIRO_ID   = FT.PARCEIRO_ID
        AND UNEM.PARCEIRO_ID = ME.UNIDADE_EMPRESARIAL_ID`,
         [nf], { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (qr.rows && qr.rows.length) {
    const row = qr.rows[0];
    const { UNIDADE_EMPRESARIAL_ID, CARTEIRA_BANCARIA_ID, TITULO_ID,NOME_EMPRESA, CNPJ_EMPRESA } = row;

    const boleto = await obterLinhaDigitavel(UNIDADE_EMPRESARIAL_ID, CARTEIRA_BANCARIA_ID, TITULO_ID);

    if (boleto.sucesso) {
      const caminhoPDF = await gerarBoletoPDF({
        nome: row.PRCR_NOME,
        cpfCnpj: row.PRCR_CGC_CPF,
        valor: row.TITL_VALOR,
        vencimento: row.TITL_DT_VENCTO,
        linhaDigitavel: boleto.linhaDigitavel,
        codigoBarra: boleto.codigoBarra,
        recebedorNome: row.NOME_EMPRESA,
        recebedorCnpj: row.CNPJ_EMPRESA
      });
      console.log('Arquivo PDF gerado em:', caminhoPDF);
      console.log('Arquivo existe?', fs.existsSync(caminhoPDF));
      await msg.reply(`📄 Segunda via da fatura (NF ${nf}):\n🔢 Linha digitável:\n${boleto.linhaDigitavel}`);
       
      const pdfBuffer = fs.readFileSync(caminhoPDF);
      const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), `boleto_${nf}.pdf`);

      // await client.sendMessage(msg.from, fs.readFileSync(caminhoPDF), {
      //   sendMediaAsDocument: true,
      //   filename: `boleto_${nf}.pdf`
      // });
      await client.sendMessage(msg.from, media, {
       sendMediaAsDocument: true
      });
      await flowControl.setStep(userId, 'financeiro_pos_boleto');
     // fs.unlinkSync(caminhoPDF);

      await msg.reply('✅ Caso precise de renegociar ou falar com um atendente, digite *2*');
    } else {
      await msg.reply(`❌ NF ${nf} não encontrada. Digite *Financeiro* para tentar novamente ou *2* para atendimento.`);
    }

  // if (qr.rows && qr.rows.length) {
  //   const cod = qr.rows[0].COD_BARRAS || 'código não encontrado';
  //   await msg.reply(`📄 Segunda via da fatura (NF ${nf}):\nCódigo de barras:\n${cod}`);
  //   await msg.reply('✅ Caso precise de renegociar ou falar com um atendente, digite *2* ou *3* no menu.');
  // } else {
  //   await msg.reply(`❌ NF ${nf} não encontrada. Digite *Financeiro* para tentar novamente ou *3* para atendimento.`);
  // }
  
 
  //await flowControl.clearStep(userId);
 }
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

async function obterLinhaDigitavel(unidadeId, carteiraId, tituloId) {
  try {
    const result = await db.query(
      `
      BEGIN
        PRC_DADOS_BOLETO(
          :P_UNIDADE_EMPRESARIAL_ID,
          :P_CONTA_CONTA_CORRENTE_ID,
          :P_CARTEIRA_BANCARIA_ID,
          :P_TITULO_ID,
          :P_CODIGO_BARRA,
          :P_NOSSO_NUMERO,
          :P_LINHA_DIGITAVEL,
          :P_NOSSO_NUMEROD,
          :P_NOSSO_NUMEROP,
          :P_DIGITAO_COBRANCA,
          :P_TITL_NOSSO_NUMERO_CORRESP
        );
      END;
      `,
      {
        P_UNIDADE_EMPRESARIAL_ID: unidadeId,
        P_CONTA_CONTA_CORRENTE_ID: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: '' }, // passou vazio pq vc não tem valor
        P_CARTEIRA_BANCARIA_ID: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: carteiraId },
        P_TITULO_ID: tituloId,
        P_CODIGO_BARRA: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        P_NOSSO_NUMERO: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        P_LINHA_DIGITAVEL: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        P_NOSSO_NUMEROD: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        P_NOSSO_NUMEROP: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        P_DIGITAO_COBRANCA: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        P_TITL_NOSSO_NUMERO_CORRESP: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 }
      }
    );

    return {
      sucesso: true,
      linhaDigitavel: result.outBinds.P_LINHA_DIGITAVEL,
      codigoBarra: result.outBinds.P_CODIGO_BARRA,
      nossoNumero: result.outBinds.P_NOSSO_NUMERO,
      mensagem: 'Ok'
      
    };
  } catch (err) {
    console.error('Erro ao executar PRC_DADOS_BOLETO:', err);
    return { sucesso: false, erro: err };
  }
}

module.exports = {
  iniciar,
  continuar,
  processarNF
};

