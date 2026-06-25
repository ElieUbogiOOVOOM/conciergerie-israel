// ESLint pour apps/api : reprend la config partagée du monorepo.
import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    rules: {
      // NestJS s'appuie massivement sur l'injection par décorateurs : les
      // imports de classes en position de type doivent rester des imports
      // de valeur (emitDecoratorMetadata).
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
