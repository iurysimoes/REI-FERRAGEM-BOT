require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const handleMessage = require('./router');
const express = require('express');
const app = express();
const path = require('path');
const routesVolumes = require('./routesVolumes'); // ajusta o caminho conforme seu projeto

app.use(express.json()); // pra conseguir ler JSON no body das requisições
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', routesVolumes);

const client = new Client({
  authStrategy: new LocalAuth(),
});

const qrcode = require('qrcode-terminal');

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true }); // isso mostra o QR no terminal
});

//client.on('qr', qr => console.log('QR RECEIVED', qr));
client.on('ready', () => console.log('✅ WhatsApp Client pronto!'));
client.on('message', async (msg) => {
  //console.log('[index.js] Mensagem recebida:', msg); // 👈 coloca isso
  //console.log('Nome do grupo:', chat.name);
  await handleMessage(client, msg);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

client.initialize();
