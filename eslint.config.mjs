import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        ignores: ['coverage/**']
    },
    {
        files: ['**/*.js'],
        plugins: { js },
        extends: ['js/recommended']
    },
    {
        // Сървърът и настройките са CommonJS и вървят в Node.
        files: ['src/**/*.js', 'scripts/**/*.js', 'jest.config.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: globals.node
        }
    },
    {
        // Кодът на страницата е ES модули и върви в браузъра.
        files: ['public/js/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            globals: globals.browser
        }
    },
    {
        // Тестовете на фронтенда вървят в jsdom, затова им трябват и браузърните globals.
        files: ['tests/**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node, ...globals.browser, ...globals.jest }
        }
    }
]);