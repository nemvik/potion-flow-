import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";
export default ts.config(
  { ignores: ["dist/**", "node_modules/**", "design/**", "artifacts/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["scripts/render-reference.mjs"],
    languageOptions: {
      globals: {
        S: "readonly",
        applyViewport: "readonly",
        setPreview: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
