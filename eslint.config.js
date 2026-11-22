import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig(
    globalIgnores(["build/", "dist/"]),
    js.configs.recommended,
    {
        files: ["src/**/*.js", "stories/**/*.js", ".storybook/**/*.js"],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ["*.{js,mjs}", "scripts/**/*.mjs", "src/**/*.test.js"],
        languageOptions: { globals: globals.node },
    },
    {
        rules: {
            "no-unused-vars": ["error", { args: "none" }],
        },
    }
);
