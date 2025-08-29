require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const handleMessage = require('./router');
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const routesVolumes = require('./routesVolumes'); // ajusta o caminho conforme seu projeto
const { verificarNovosPedidos } = require('./controllers/controllerNotificacoes');

// ou, se quiser liberar só pra um domínio específico (mais seguro):
 app.use(cors({ origin: 'https://rei-ferragem-bot.vercel.app' }));

//app.use(express.static(path.join(__dirname, 'public')));


app.use(express.json()); // pra conseguir ler JSON no body das requisições
app.use(express.static(path.join(__dirname, 'public')));

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../public/index.html'));
// });


app.use('/', routesVolumes);
//app.use('/api', routesVolumes);

const client = new Client({
  authStrategy: new LocalAuth(),
});

// registra listener só uma vez
if (!global.listenerRegistrado) {
  client.on('message', async (msg) => {
    await handleMessage(client, msg);
  });
  global.listenerRegistrado = true;
}

const qrcode = require('qrcode-terminal');

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true }); // isso mostra o QR no terminal
});

//client.on('qr', qr => console.log('QR RECEIVED', qr));
//client.on('ready', () => console.log('✅ WhatsApp Client pronto!'));
client.on('ready', () => {
  console.log('✅ WhatsApp Client pronto!');

  // Inicia o loop de verificação de pedidos a cada 10 segundos
  setInterval(() => {
    verificarNovosPedidos(client);
  }, 10000); // 10 segundos
});
//client.on('message', async (msg) => {
  //console.log('[index.js] Mensagem recebida:', msg); // 👈 coloca isso
  //console.log('Nome do grupo:', chat.name);
  //await handleMessage(client, msg);
//});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

client.initialize();
