const supportModel = require('../models/supportModel');

async function listerSupportsFormation(id_formation) {
  return await supportModel.getSupportsByFormation(id_formation);
}

async function creerSupport(id) {
  return await supportModel.createSupport(id);
}

async function supprimerSupport(id) {
  return await supportModel.deleteSupport(id);
}

module.exports = {
 supprimerSupport,
 listerSupportsFormation,
 creerSupport
};