import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import perfectionist from "eslint-plugin-perfectionist";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export default [
  eslint.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
  {
    ...perfectionist.configs["recommended-natural"],
    rules: {
      "perfectionist/sort-classes": [
        "error",
        {
          partitionByComment: true,
          type: "natural",
        },
      ],
      "perfectionist/sort-imports": [
        "error",
        {
          internalPattern: ["^@/.*"],
          type: "natural",
        },
      ],
    },
  },
  {
    ignores: [
      "eslint.config.mjs",
      ".prettierrc.mjs",
      "lint-staged.config.mjs",
      "dist/**",
    ],
  },
];
