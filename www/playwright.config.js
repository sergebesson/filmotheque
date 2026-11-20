import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	testIgnore: "**/empty-catalogue.spec.js",
	workers: 1,
	use: {
		baseURL: "http://localhost:4173",
		httpCredentials: { username: "serge", password: "test-admin" },
		launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
	},
	// Deux contextes Chromium, pas Safari/iOS ni un appareil réel. Le lecteur hérite
	// de ces options et surcharge seulement les credentials dans client.spec.js.
	// HTTP/stores/configuration tournent dans Node, même sous le projet mobile.
	projects: [
		{ name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
		{ name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
	],
	webServer: {
		command: "node tests/server.cjs",
		url: "http://localhost:4173/logout",
		reuseExistingServer: false,
	},
});
