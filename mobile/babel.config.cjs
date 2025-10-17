// mobile/babel.config.cjs
module.exports = function (api) {
  api.cache(true);

  // Detecta ambiente (valor vindo do script PowerShell ou padrão = dev)
  const APP_ENV = process.env.APP_ENV || "dev";
  const envFile = `.env.${APP_ENV}`;

  console.log(`📦 [Babel] Carregando arquivo de ambiente: ${envFile}`);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: (() => {
            const envFile =
              process.env.APP_ENV === "prod" ? ".env.prod" : ".env.dev";
            console.log(`[Babel] Carregando arquivo de ambiente: ${envFile}`);
            return envFile;
          })(),
          safe: false,
          allowUndefined: true,
        },
      ],
      ["module-resolver", { root: ["./"], alias: { "@": "./src" } }],
      "react-native-worklets/plugin", // deve continuar sendo o último
    ],
  };
};
