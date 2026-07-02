import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**"
    ]
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "prefer-const": "error",
      "no-duplicate-imports": "error",
      "object-shorthand": ["error", "always"]
    }
  }
]);