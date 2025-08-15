// back-end/router.js

const controllerPedido = require('./controllers/controllerPedido');
const controllerFinanceiro = require('./controllers/controllerFinanceiro');
const controllerAntecipado = require('./controllers/controllerAntecipado');
const controllerCadastro = require('./controllers/controllerCadastro');
const { redirecionar } = require('./controllers/controllerRedirecionamento');
//const { getStep, setStep } = require('./flowcontrol'); // Corrigido: usar await
const flowControl = require('./flowcontrol');
const NUMERO_FIXO = '556284315872';

async function handleMessage(client, msg) {
  console.log('[router.js] Entrou na função handleMessage');

  if (msg.fromMe) return; //processa somente mensagens que Não são suas
  if (msg.from.endsWith('@g.us')) return;//se comentar responde conversas privadas normalmente

  const chat = await msg.getChat();
  //if (!chat.isGroup || chat.name !== 'BOT REI') return;//se comentar ele responde qualquer grupo

  const userId = msg.author || msg.from;
  //const text = msg.body?.toLowerCase().trim() || '';
  let text = msg.body?.toLowerCase().trim() || '';

  const etapa = await flowControl.getStep(userId); // Corrigido: await para funcionar corretamente

  console.log(`Mensagem do grupo "${chat.name}" - Usuário: ${userId} - Texto: "${text}"`);
  
  // Atalho para voltar ao menu principal
if (text === 'menu' || text === '0') {
  await flowControl.clearStep(userId);
  return client.sendMessage(
    msg.from,
    '🤖 Você voltou ao menu principal! Digite uma das opções abaixo:\n\n' +
    '1️⃣ - Pedido\n' +
    '2️⃣ - Pedido Chegou\n' +
    '3️⃣ - Financeiro\n' +
    '4️⃣ - Cadastro Cliente\n' +
    '5️⃣ - Antecipado\n' +
    '6️⃣ - Pós-Venda\n' +
    '7️⃣ - Volume Danificado\n' +
    '8️⃣ - Volume Faltou\n' +
    '9️⃣ - Outros Assuntos'
  );
}

  // 🔢 Mapeamento de opções numéricas para palavras-chave
  const opcoesMenu = {
    '1': 'pedido',
    '2': 'pedido chegou',
    '3': 'financeiro',
    '4': 'cadastro cliente',
    '5': 'antecipado',
    '6': 'pós venda',
    '7': 'volume danificado',
    '8': 'volume faltou',
    '9': 'outros assuntos'
  };

  if (opcoesMenu[text]) {
    console.log(`[router.js] Entrada numérica detectada: ${text} => ${opcoesMenu[text]}`);
    text = opcoesMenu[text];
  }
  // 🔁 Fluxos ativos
  if (etapa?.startsWith('chegou')) {
    return controllerPedido.chegou(client, msg); // fluxo múltiplas etapas do "Pedido Chegou"
  }

  if (etapa === 'aguardando_numero_pedido_codigo') {
    return controllerPedido.chegou(client, msg); // fluxo "Pedido Chegou"
  }

  if (etapa === 'aguardando_redirecionar_Chegou') {
    return controllerPedido.chegou(client, msg); // fluxo "Pedido Chegou"
  }

  if (etapa === 'acompanhamento' || etapa === 'AGUARDANDO_NUMERO')  {
    return controllerPedido.iniciar(client, msg);
  }

  // if (etapa === 'financeiro_menu') {
  // return controllerFinanceiro.continuar(client, msg);
  // }

//if (etapa?.toLowerCase() === 'financeiro_menu') {
if (etapa === 'financeiro_menu' || etapa === 'financeiro_pos_boleto'){
 //console.log('[router.js] Chamando controllerFinanceiro.continuar');
 return controllerFinanceiro.continuar(client, msg);
}

  if (etapa === 'financeiro_aguardando_nf') {
    return controllerFinanceiro.processarNF(client, msg);
  }

  if (etapa === 'aguardando_dados_cadastro') {
    return controllerCadastro.continuar(client, msg);
    
  }
   // Fluxo Antecipado - passo 1: aguarda arquivo
  if (etapa === 'aguardando_comprovante_antecipado') {
    return controllerAntecipado.continuar(client, msg);
  }

  if (etapa === 'AGUARDANDO_OPCAO_DEPOIS_DO_PEDIDO') {
     return controllerPedido.iniciar(client, msg);
  }
  
  // 🎯 Gatilhos de entrada (menus principais)

  if (text.includes('pedido chegou')) {
    console.log('chamou pedido chegou');
    //await flowControl.setStep(userId, 'chegou_menu');
    return controllerPedido.chegou(client, msg);
  }

  if (text.includes('pedido')) {
    console.log('chamou pedido ');
    //await setStep(userId, 'acompanhamento');
    await flowControl.clearStep(userId);
    return controllerPedido.iniciar(client, msg);
  }

  if (text.includes('financeiro')) {
    console.log('[router.js] Fluxo financeiro iniciado. Etapa setada para financeiro_menu');
    await flowControl.setStep(userId, 'financeiro_menu');
    return controllerFinanceiro.iniciar(client, msg);
  }
  
  if (text.includes('antecipado')) {
    await flowControl.setStep(userId, 'aguardando_comprovante_antecipado');
    return controllerAntecipado.iniciar(client, msg);
  }
  
  if (text.includes('cadastro cliente')) {
    await flowControl.setStep(userId, 'aguardando_dados_cadastro'); // já define aqui també
    return controllerCadastro.iniciar(client, msg);
  }

  if (text.includes('pós venda') || text.includes('pos venda')) {
    return redirecionar(client, msg, 'posvenda', 'Pós-Venda');
  }

  if (text.includes('volume danificado')) {
    return redirecionar(client, msg, 'danificado', 'Volume Danificado');
  }

  if (text.includes('volume faltou')) {
    return redirecionar(client, msg, 'faltou', 'Volume Faltando');
  }

  if (text.includes('outros assuntos')) {
    return redirecionar(client, msg, 'outros', 'Outros Assuntos');
  }

  // if (text === '10' || text === 'atendente') {
  //   await flowControl.clearStep(userId);
  //   return redirecionarAtendente(client, msg, 'atendimento'); // ou o parâmetro que seu redirecionarAtendente espera
  // }
  // Fallback
  // await client.sendMessage(
  //   msg.from,
  //   '🤖 Olá! Digite uma das palavras-chave \n para iniciar o seu atendimento  \n\n *Pedido* \n *Financeiro* \n *Cadastro Cliente* \n *Antecipado* \n *Pós-Venda* \n *Pedido Chegou* \n *Volume Danificado* \n *Volume Faltou* \n *Outros Assuntos*'
  // );
  // 📩 Fallback: se não reconheceu nenhuma palavra-chave
  await client.sendMessage(
    msg.from,
    '🤖 Olá! Digite uma das opções para iniciar o seu atendimento:\n\n' +
    '1️⃣ - Pedido\n' +
    '2️⃣ - Pedido Chegou\n' +
    '3️⃣ - Financeiro\n' +
    '4️⃣ - Cadastro Cliente\n' +
    '5️⃣ - Antecipado\n' +
    '6️⃣ - Pós-Venda\n' +
    '7️⃣ - Volume Danificado\n' +
    '8️⃣ - Volume Faltou\n' +
    '9️⃣ - Outros Assuntos'
  );
}

module.exports = handleMessage;
