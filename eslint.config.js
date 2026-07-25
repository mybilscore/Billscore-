import eslintReact from "@eslint-react/eslint-plugin";
import eslintJs from "@eslint/js";
import eslintParserTypeScript from "@typescript-eslint/parser";
import perfectionist from "eslint-plugin-perfectionist";
import eslintPluginReadableTailwind from "eslint-plugin-readable-tailwind";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslintJs.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  // fatima.eslint.plugin,
  { ignores: ["node_modules", ".next", "dist", "build", "out", "**/*"] }, // Ignore ALL files
  {
    files: ["**/*.{ts,tsx}"],
    ...eslintReact.configs["recommended-typescript"],
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: true,
      },
    },
    rules: {
      // ⚠️ IMPORTANT: Disable TypeScript ESLint unused vars rule
      "@typescript-eslint/no-unused-vars": "off",

      // Also disable the base no-unused-vars
      "no-unused-vars": "off",

      // Your other disabled rules
      "@eslint-react/hooks-extra/no-direct-set-state-in-use-effect": "off",
      "@eslint-react/no-array-index-key": "off",
      "@eslint-react/no-forward-ref": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-useless-escape": "off",

      // Disable perfectionist rules
      "perfectionist/sort-jsx-props": "off",
      "perfectionist/sort-object-types": "off",
      "perfectionist/sort-objects": "off",
      "perfectionist/sort-imports": "off",
      "perfectionist/sort-interfaces": "off",
      "perfectionist/sort-enums": "off",
      "perfectionist/sort-classes": "off",
      "perfectionist/sort-array-includes": "off",
      "perfectionist/sort-named-exports": "off",
      "perfectionist/sort-named-imports": "off",

      // Disable readable-tailwind rules
      "readable-tailwind/multiline": "off",
      "readable-tailwind/sort-classes": "off",
    },
  },
);
