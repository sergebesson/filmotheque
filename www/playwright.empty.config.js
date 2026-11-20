import { defineConfig } from "@playwright/test";
import config from "./playwright.config.js";

export default defineConfig({
	...config,
	testIgnore: [],
	testMatch: "**/empty-catalogue.spec.js",
	webServer: { ...config.webServer, command: "node tests/server.cjs --empty" },
});
