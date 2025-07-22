const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'usersteps.json');

let userSteps = {};

// Carrega o arquivo quando o bot inicia
if (fs.existsSync(filePath)) {
  const raw = fs.readFileSync(filePath);
  userSteps = JSON.parse(raw);
}

function saveSteps() {
  try {
  fs.writeFileSync(filePath, JSON.stringify(userSteps, null, 2));
  console.log('[flowcontrol] usersteps.json atualizado:', JSON.stringify(userSteps, null, 2));
  } catch (err) {
    console.error('[flowcontrol] Erro ao salvar usersteps.json:', err);
  }
}

function setStep(userId, step) {
  userSteps[userId] = step;
  saveSteps(); // salva no arquivo
}

function getStep(userId) {
  return userSteps[userId] || null;
}

function clearStep(userId) {
  delete userSteps[userId];
  saveSteps(); // salva no arquivo
}

module.exports = {
  setStep,
  getStep,
  clearStep,
};
