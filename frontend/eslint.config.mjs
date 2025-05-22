// eslint.config.mjs - Vervang je huidige bestand
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 🚫 Zet alle annoying rules uit
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/no-html-link-for-pages": "off",
      "prefer-const": "off",
      "no-unused-vars": "off",
      "no-console": "off",
      "no-debugger": "off",

      // Alles op warning i.p.v. error
      "@typescript-eslint/no-unused-expressions": "warn",
      "react/jsx-key": "warn",
      "react/display-name": "warn"
    },
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "build/"
    ]
  }
];

export default eslintConfig;