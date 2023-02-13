"use strict";

module.exports = {
	env: {
		node: true,
		mocha: true,
		es2022: true,
	},
	parserOptions: {
		ecmaVersion: "latest",
	},
	plugins: [ "node" ],
	extends: [ "eslint:recommended", "plugin:node/recommended" ],
	rules: {
		/**
		 * Possible Errors (la plupart sont activées par défaut et ne sont pas répétées ici si elles ne sont pas surchargées)
		 */
		"no-console": "warn", //surchargée
		"no-extra-parens": [ "warn", "all", { nestedBinaryExpressions: false } ],
		"no-prototype-builtins": "off",
		"no-template-curly-in-string": "warn",
		"no-unsafe-negation": "warn",
		"valid-jsdoc": "off",
		/**
		 * Best Practices (quelques unes sont activées par défaut et ne sont pas répétées ici si elles ne sont pas surchargées)
		 */
		"accessor-pairs": "warn",
		"array-callback-return": "error",
		"block-scoped-var": "warn",
		"class-methods-use-this": "warn",
		complexity: [ "warn", 10 ],
		"consistent-return": "off",
		curly: [ "warn", "all" ],
		"default-case": "warn",
		"dot-location": [ "warn", "property" ],
		"dot-notation": "warn",
		eqeqeq: [ "error", "smart" ],
		"guard-for-in": "warn",
		"no-alert": "error",
		"no-caller": "error",
		"no-div-regex": "off",
		"no-else-return": "warn",
		"no-empty-function": "warn",
		"no-eq-null": "warn",
		"no-eval": "error",
		"no-extend-native": "warn",
		"no-extra-bind": "warn",
		"no-extra-label": "warn",
		"no-fallthrough": "warn",
		"no-floating-decimal": "warn",
		"no-global-assign": "error",
		"no-implicit-coercion": "warn",
		"no-implicit-globals": "error",
		"no-implied-eval": "error",
		"no-invalid-this": "warn",
		"no-iterator": "error",
		"no-labels": "warn",
		"no-lone-blocks": "warn",
		"no-loop-func": "warn",
		"no-magic-numbers": "off",
		"no-multi-spaces": "warn",
		"no-multi-str": "error",
		"no-new": "warn",
		"no-new-func": "error",
		"no-new-wrappers": "error",
		"no-octal": "error",
		"no-octal-escape": "error",
		"no-param-reassign": "warn",
		"no-proto": "error",
		"no-redeclare": "error",
		"no-restricted-properties": "off",
		"no-return-assign": "warn",
		"no-script-url": "error",
		"no-self-assign": "warn",
		"no-self-compare": "warn",
		"no-sequences": "warn",
		"no-throw-literal": "error",
		"no-unmodified-loop-condition": "error",
		"no-unused-expressions": "error",
		"no-unused-labels": "error",
		"no-useless-call": "warn",
		"no-useless-concat": "warn",
		"no-useless-escape": "warn",
		"no-useless-return": "warn",
		"no-void": "error",
		"no-warning-comments": "warn",
		"no-with": "error",
		radix: "warn",
		"vars-on-top": "off",
		"wrap-iife": [ "error", "inside" ],
		yoda: "warn",
		/**
		 * Strict Mode
		 */
		strict: "error",
		/**
		 * Variables (quelques unes sont activées par défaut et ne sont pas répétées ici si elles ne sont pas surchargées)
		 */
		"init-declarations": "off",
		"no-catch-shadow": "warn",
		"no-label-var": "warn",
		"no-restricted-globals": "off",
		"no-shadow": "error",
		"no-shadow-restricted-names": "error",
		"no-undef-init": "off",
		"no-undefined": "off",
		"no-use-before-define": "off",
		/**
		 * Node.js and CommonJS
		 */
		"callback-return": "warn",
		"global-require": "warn",
		"handle-callback-err": "warn",
		"no-mixed-requires": "warn",
		"no-new-require": "warn",
		"no-path-concat": "warn",
		"no-process-env": "off",
		"no-process-exit": "warn",
		"no-restricted-modules": "off",
		"no-sync": "warn",
		/**
		 * Stylistic Issues (quelques unes sont activées par défaut et ne sont pas répétées ici si elles ne sont pas surchargées)
		 */
		"array-bracket-spacing": [ "error", "always" ],
		"block-spacing": [ "error", "always" ],
		"brace-style": [ "warn", "1tbs" ],
		camelcase: [ "warn", { properties: "never" } ],
		"comma-dangle": [ "warn", "always-multiline" ],
		"comma-spacing": [ "warn", { before: false, after: true } ],
		"comma-style": [ "warn", "last" ],
		"computed-property-spacing": [ "warn", "never" ],
		"consistent-this": "off",
		"eol-last": [ "warn", "always" ],
		"func-call-spacing": [ "warn", "never" ],
		"func-name-matching": "off",
		"func-names": "off",
		"func-style": "off",
		"id-blacklist": "off",
		"id-length": [ "warn", {
			min: 3,
			exceptions: [ "$q", "id", "x", "y", "_", "me", "to", "i", "j", "k", "on", "qs", "vm", "fs", "el" ],
		} ],
		"id-match": "off",
		indent: [ "warn", "tab", { SwitchCase: 1, MemberExpression: 1, FunctionDeclaration: { body: 1, parameters: 2 }, FunctionExpression: { body: 1, parameters: 2 } } ],
		"jsx-quotes": "off",
		"key-spacing": [ "warn", { beforeColon: false, afterColon: true, mode: "strict" } ],
		"keyword-spacing": [ "warn", { before: true, after: true } ],
		"line-comment-position": "off",
		"linebreak-style": [ "warn", "unix" ],
		"lines-around-comment": "off",
		"lines-around-directive": "off",
		"max-depth": [ "warn", { max: 5 } ],
		"max-len": [ "warn", { code: 100, ignoreStrings: true, ignoreUrls: true, ignoreTemplateLiterals: true, ignoreComments: true } ],
		"max-lines": [ "warn", { max: 1000 } ],
		"max-nested-callbacks": [ "warn", { max: 5 } ],
		"max-params": [ "warn", { max: 5 } ],
		"max-statements-per-line": [ "warn", { max: 2 } ],
		"max-statements": "off",
		"multiline-ternary": "off",
		"new-cap": "warn",
		"new-parens": "warn",
		"newline-after-var": "off",
		"newline-before-return": "off",
		"newline-per-chained-call": "off",
		"no-array-constructor": "error",
		"no-bitwise": "warn",
		"no-continue": "warn",
		"no-inline-comments": "off",
		"no-lonely-if": "warn",
		"no-mixed-operators": "warn",
		"no-multiple-empty-lines": "warn",
		"no-negated-condition": "off",
		"no-nested-ternary": "warn",
		"no-new-object": "error",
		"no-plusplus": "off",
		"no-restricted-syntax": "off",
		"no-tabs": "off",
		"no-ternary": "off",
		"no-trailing-spaces": "warn",
		"no-underscore-dangle": "off",
		"no-unneeded-ternary": "warn",
		"no-whitespace-before-property": "warn",
		"object-curly-newline": "off",
		"object-curly-spacing": [ "error", "always" ],
		"object-property-newline": "off",
		"one-var-declaration-per-line": "off",
		"one-var": "off",
		"operator-assignment": "off",
		"operator-linebreak": [ "warn", "after" ],
		"padded-blocks": "off",
		"quote-props": [ "warn", "as-needed" ],
		quotes: [ "warn", "double" ],
		"require-jsdoc": "off",
		"semi-spacing": [ "warn", { before: false, after: true } ],
		semi: [ "warn", "always" ],
		"sort-keys": "off",
		"sort-vars": "off",
		"space-before-blocks": [ "warn", "always" ],
		"space-before-function-paren": [ "warn", { anonymous: "always", named: "never", asyncArrow: "never" } ],
		"space-in-parens": [ "warn", "never" ],
		"space-infix-ops": "warn",
		"space-unary-ops": [ "warn", { words: true, nonwords: false } ],
		"spaced-comment": "off",
		"unicode-bom": "off",
		"wrap-regex": "off",
		/**
		 * ECMAScript 6 (quelques unes sont activées par défaut et ne sont pas répétées ici si elles ne sont pas surchargées)
		 */
		"arrow-body-style": "off",
		"arrow-parens": "off",
		"arrow-spacing": [ "warn", { before: true, after: true } ],
		"generator-star-spacing": [ "warn", { before: false, after: true } ],
		"no-confusing-arrow": "off",
		"no-duplicate-imports": "warn",
		"no-restricted-imports": "off",
		"no-useless-computed-key": "warn",
		"no-useless-constructor": "warn",
		"no-useless-rename": "warn",
		"no-var": "off",
		"object-shorthand": "off",
		"prefer-arrow-callback": "off",
		"prefer-const": "off",
		"prefer-numeric-literals": "off",
		"prefer-rest-params": "off",
		"prefer-spread": "off",
		"prefer-template": "warn",
		"rest-spread-spacing": "off",
		"sort-imports": "off",
		"symbol-description": "warn",
		"template-curly-spacing": "off",
		"yield-star-spacing": [ "warn", { before: false, after: true } ],
		/**
		 * Plugin Node
		 */
		"node/no-deprecated-api": "warn",
	},
};
