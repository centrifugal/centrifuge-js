const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');

module.exports = [
    { ignores: ['dist/**', 'build/**'] },
    js.configs.recommended,
    ...tseslint.configs['flat/recommended'],
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'off',
        },
        rules: {
            'no-undef': 'off',
            'no-prototype-builtins': 'off',
            'no-constant-condition': 'off',
            '@typescript-eslint/ban-ts-comment': [
                'error',
                { 'ts-ignore': 'allow-with-description' },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
        },
    },
];
