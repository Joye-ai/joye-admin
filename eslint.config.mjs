import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "plugin:import/recommended", "plugin:import/typescript", "prettier"),
  {
    settings: {
      "import/resolver": {
        typescript: {
          project: __dirname,
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    rules: {
      "import/no-unresolved": "error",
      "import/order": [
        "warn",
        {
          "groups": [["builtin", "external", "internal"], ["parent", "sibling", "index"]],
          "newlines-between": "always",
          "alphabetize": { "order": "asc", "caseInsensitive": true },
          "pathGroups": [
            { "pattern": "@/**", "group": "internal", "position": "after" }
          ],
          "pathGroupsExcludedImportTypes": ["builtin"],
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn", // Temporarily allow any types
      "@typescript-eslint/no-unused-vars": "warn", // Temporarily allow unused vars
    },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
