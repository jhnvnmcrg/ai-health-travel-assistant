import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Deliberately narrow: the rules that catch bugs this codebase can actually
 * have. Formatting is prettier's job, so nothing here has an opinion about it.
 *
 * `components/ui/**` and `convex/_generated/**` are excluded because both are
 * regenerated — `npx gluestack-ui add <component>` and `npx convex dev` would
 * overwrite anything a linter talked us into changing.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "convex/_generated/**",
      "components/ui/**",
      ".agents/**",
      ".claude/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // The exhaustive-deps warning is the one that matters here: the
      // conversation and user-sync effects both depend on getting it right.
      "react-hooks/exhaustive-deps": "error",

      // Tool results and third-party JSON arrive untyped; the narrowing
      // helpers that read them are the intended place for `any` to stop.
      "@typescript-eslint/no-explicit-any": "warn",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Build configuration is CommonJS and runs in Node, not in the app bundle.
  {
    files: ["babel.config.js", "metro.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "writable",
        require: "readonly",
        process: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
