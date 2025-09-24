// mobile/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// impede o Metro de procurar configurações acima de /mobile
// config.resolver.disableHierarchicalLookup = true;

module.exports = config;
