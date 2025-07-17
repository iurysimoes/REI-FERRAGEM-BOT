// back-end/flowControl.js

const userSteps = {}; // { 'user_id': 'ETAPA_ATUAL' }

function setStep(userId, step) {
  userSteps[userId] = step;
}

function getStep(userId) {
  return userSteps[userId] || null;
}

function clearStep(userId) {
  delete userSteps[userId];
}

module.exports = {
  setStep,
  getStep,
  clearStep,
};
