// mobile/babel.config.cjs
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
          allowUndefined: false,
          safe: false,
        },
      ],
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
          },
          extensions: [".js", ".jsx", ".json"],
        },
      ],
    ],
  };
};
