// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
    },
  },
]);
