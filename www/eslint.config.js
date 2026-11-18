import eslint from "@eslint/js";
import vue from "eslint-plugin-vue";
import globals from "globals";
import parser from "vue-eslint-parser";

export default [
	{ ignores: ["**/node_modules/**", "**/.*", "**/*.mjs", "dist/**", "playwright-report/**", "test-results/**"] },
	{
		files: ["**/*.{js,cjs,vue}"],
		languageOptions: {
			parser,
			ecmaVersion: "latest",
			sourceType: "module",
			globals: { ...globals.browser, ...globals.es2021 },
		},
		linterOptions: { reportUnusedDisableDirectives: "off" },
		plugins: { vue },
		rules: {
			...eslint.configs.recommended.rules,
			...Object.assign({}, ...vue.configs["flat/recommended"].map(config => config.rules)),
			// Conserver le recommandé ESLint 8, sans les nouvelles règles de 10.
			"no-constant-binary-expression": "off",
			"no-empty-static-block": "off",
			"no-new-native-nonconstructor": "off",
			"no-unassigned-vars": "off",
			"no-unused-private-class-members": "off",
			"no-useless-assignment": "off",
			"preserve-caught-error": "off",
			"no-extra-semi": "error",
			"no-inner-declarations": ["error", "functions", { blockScopedFunctions: "disallow" }],
			"no-mixed-spaces-and-tabs": "error",
			"no-new-symbol": "error",
			"no-unused-vars": ["error", { caughtErrors: "none" }],
			"no-constant-condition": ["error", { checkLoops: "all" }],
			// Le contrôle étendu des noms de classes/imports est accepté (MOD-10).
			"no-shadow-restricted-names": ["error", { reportGlobalThis: false }],
			// Conserver le périmètre Vue 9 ; block-order remplace component-tags-order.
			"vue/no-deprecated-delete-set": "off",
			"vue/no-deprecated-model-definition": "off",
			"vue/valid-define-options": "off",
			"vue/no-required-prop-with-default": "off",
			"vue/no-mutating-props": ["error", { shallowOnly: true }],
			"vue/multi-word-component-names": "off",
			"vue/html-indent": ["warn", "tab"],
			"vue/max-attributes-per-line": "off",
			"vue/singleline-html-element-content-newline": "off",
			"vue/html-self-closing": "off",
		},
	},
	{ files: ["**/*.vue"], processor: vue.processors[".vue"] },
	{
		files: ["eslint.config.js", "playwright.config.js", "tests/server.cjs", "tests/configuration.spec.js", "tests/stores.spec.js", "tests/http.spec.js"],
		languageOptions: { globals: { ...globals.node, GLOBAL: "readonly", root: "readonly" } },
	},
];
