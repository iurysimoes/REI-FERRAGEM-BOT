const fs = require('fs');
const path = require('path');

const stepsPath = path.resolve(__dirname, 'usersteps.json');
const dataPath = path.resolve(__dirname, 'userdata.json');

let userSteps = {};
let userData = {};

// Carrega os arquivos quando o bot inicia
if (fs.existsSync(stepsPath)) {
  const raw = fs.readFileSync(stepsPath);
  userSteps = JSON.parse(raw);
}

if (fs.existsSync(dataPath)) {
  const raw = fs.readFileSync(dataPath);
  userData = JSON.parse(raw);
}

function saveSteps() {
  try {
    fs.writeFileSync(stepsPath, JSON.stringify(userSteps, null, 2));
    console.log('[flowcontrol] usersteps.json atualizado:', JSON.stringify(userSteps, null, 2));
  } catch (err) {
    console.error('[flowcontrol] Erro ao salvar usersteps.json:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(userData, null, 2));
    console.log('[flowcontrol] userdata.json atualizado:', JSON.stringify(userData, null, 2));
  } catch (err) {
    console.error('[flowcontrol] Erro ao salvar userdata.json:', err);
  }
}

function setStep(userId, step) {
  userSteps[userId] = step;
  saveSteps();
}

function getStep(userId) {
  return userSteps[userId] || null;
}

function clearStep(userId) {
  delete userSteps[userId];
  saveSteps();
}

// 💾 Novas funções
function setData(userId, data) {
  userData[userId] = { ...(userData[userId] || {}), ...data };
  saveData();
}

function getData(userId) {
  return userData[userId] || {};
}

function clearData(userId) {
  delete userData[userId];
  saveData();
}

module.exports = {
  setStep,
  getStep,
  clearStep,
  setData,
  getData,
  clearData,
};
