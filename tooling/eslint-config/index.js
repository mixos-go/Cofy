import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared lint baseline.
 *
 * Dependency direction and forbidden imports are NOT enforced here. They are enforced by
 * @platform/boundaries, which also covers data-plane/ (code that runs under Medusa outside our
 * workspaces and therefore cannot be resolved by eslint-plugin-import).
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
      eqeqeq: ["error", "always"],
      "prefer-const": "error"
    }
  },
  {
    // Browser bundles must not reach for Node globals.
    files: ["apps/web/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser }
    }
  },
  {
    // Standalone CLI tools: their console output is the user interface, not stray logging.
    files: ["tooling/vendor/**/*.mjs", "connectors/*/scripts/**/*.mjs"],
    rules: { "no-console": "off" }
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.medusa/**"]
  }
);
