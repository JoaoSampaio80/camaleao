// mobile/babel.config.cjs
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env", // <- importa como "@env"
          path: ".env", // <- arquivo que será lido (o seu script troca esse arquivo)
          safe: false,
          allowUndefined: true,
        },
      ],
      ["module-resolver", { root: ["./"], alias: { "@": "./src" } }],
      // ⚠️ NADA de '@babel/plugin-transform-react-jsx-self/source' aqui
      "react-native-worklets/plugin", // novo nome do plugin do Reanimated — DEVE ser o último
    ],
  };
};
