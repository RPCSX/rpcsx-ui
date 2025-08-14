import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import globals from "globals";

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        plugins: {
            '@typescript-eslint': tsEslintPlugin,
        },
        languageOptions: {
            parser: tsParser,
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            semi: [
                "error",
                "always"
            ],
            'no-undef': 'off',
            "no-unused-vars": "off",
            'no-empty': "off",
            '@typescript-eslint/no-explicit-any': "off",
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/explicit-function-return-type": "off"
        },
    }
);

