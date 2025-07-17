require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const handleMessage = require('./router');
const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));


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

client.initialize();
