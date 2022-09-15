"use strict";
/* eslint-disable no-console */

const _ = require("lodash");
const http = require("http");
const https = require("https");
const express = require("express");
const compression = require("compression");
const favicon = require("serve-favicon");
const fs = require("fs");
const requireGlob = require("require-glob");
const path = require("path");

const { LoadConfiguration } = require("./services/load-configuration.js");
const { Logger } = require("./services/logger.js");

const { publicRouterFactory } = require("./public/public.js");
const { authentificationRouterFactory } = require("./authentification/authentification.js");
const { staticRouterFactory } = require("./static/static.js");
const { apiRouterFactory } = require("./api/api.js");

class Server {

	static async createServerAndStart(configurationFile) {
		const server = new Server();
		await server.initialize(configurationFile);
		await server.start();

		return server;
	}

	constructor() {
		this.logger = null;
		this.configuration = null;
		this.app = express();
		this.server = null;
		this.handleExitSignalBind = () => this.handleExitSignal();
		this.handleReloadSignalBind = () => this.handleReloadSignal();
	}

	async initialize(configurationFile) {
		const context = await Server.initializeContext({ configurationFile });

		this.logger = context.logger;
		this.configuration = context.configLoader.getValue("server");

		this.app.use(compression());
		this.app.use((request, response, next) =>
			this.checkUrlServerMiddleware(request, response, next));
		this.app.use(favicon(path.join(__dirname, "../www", "filmotheque.ico")));
		this.app.use(publicRouterFactory(context));
		this.app.use(await authentificationRouterFactory(context));
		this.app.use(staticRouterFactory(context));
		this.app.use("/api", await apiRouterFactory(context));

		// Route d'erreur
		this.app.use((error, request, response, next) =>
			this.errorMiddleware(error, request, response, next));
	}

	static async initializeContext({ configurationFile }) {
		const loadConfiguration = new LoadConfiguration(configurationFile);
		const configLoader = await loadConfiguration.load();

		const logger = new Logger(configLoader.getValue("logs")).getLogger();
		logger.log("info", "Configuration", configLoader.config);

		const context = {
			configLoader,
			logger,
		};

		const stores = await requireGlob("stores/*.store.js");
		await Promise.all(_.map(stores, async(store, storeName) => {
			context[storeName] = new store[
				storeName.charAt(0).toUpperCase() + storeName.slice(1)
			](context);
			return await context[storeName].initialize();
		}));

		return context;
	}

	checkUrlServerMiddleware(request, response, next) {
		return request.hostname !== this.configuration.url_server ?
			response.status(403).send(`
				<html>
					<body>
						<h1>accès refusé</h1>
					</body>
				</html>
			`) :
			next();
	}

	// eslint-disable-next-line no-unused-vars
	errorMiddleware(error, request, response, next) {
		this.logger.log("error", error.stack);
		response.status(500).send(`
			<html>
				<body>
					<h1>Une erreur grave est survenue</h1>
					<hr>
					<p>Description de l'erreur : ${error.message}</p>
				</body>
			</html>
		`);
	}

	start() {
		console.log(); console.log("Server starting ...");
		this.server = this.configuration.ssl.enable ?
			https.createServer({
				/* eslint-disable-next-line no-sync */
				key: fs.readFileSync(this.configuration.ssl.keyFile),
				/* eslint-disable-next-line no-sync */
				cert: fs.readFileSync(this.configuration.ssl.certFile),
			}, this.app) :
			http.createServer(this.app);

		return new Promise((resolve, reject) => {
			this.server.on("error", (error) => {
				const messageError = `impossible server start : ${error.message}`;
				console.log(messageError);
				this.logger.log("error", messageError);
				reject(error);
			});
			this.server.on("listening", () => {
				console.log("Server started");
				this.logger.log("info", `start server to ${
					this.configuration.host
				}:${
					this.configuration.port
				} ${this.configuration.ssl.enable ? "in ssl mode" : ""}`,
				);

				this.logger.log("info", `url to start application : ${
					this.configuration.ssl.enable ? "https" : "http"
				}://${
					this.configuration.url_server
				}:${
					this.configuration.port
				}/`);

				process.on("SIGINT", this.handleExitSignalBind);
				process.on("SIGTERM", this.handleExitSignalBind);
				process.on("SIGPIPE", this.handleReloadSignalBind);

				resolve();
			});
			this.server.listen({
				port: this.configuration.port,
				host: this.configuration.host,
			});
		});

	}

	stop() {
		if (!this.server) {
			return Promise.reject(new Error("Server not running"));
		}

		return new Promise((resolve, reject) => {
			this.server.on("error", (error) => {
				this.logger.log("error", `Server not closed ${error.message}`);
				reject(error);
			});
			this.server.on("close", () => {
				this.logger.log("info", "Server is closed");
				this.server = null;
				process.removeListener("SIGINT", this.handleExitSignalBind);
				process.removeListener("SIGTERM", this.handleExitSignalBind);
				process.removeListener("SIGPIPE", this.handleReloadSignalBind);
				resolve();
			});
			this.server.close();
		});
	}

	handleExitSignal() {
		console.log(); console.log("Server stopping ...");
		this.stop()
			.then(() => {
				console.log("Server stopped");
				process.exitCode = 0;
			})
			.catch((error) => {
				console.log(`impossible server stop : ${error.message}`);
				process.exitCode = 1;
			});
	}

	async handleReloadSignal() {
		try {
			console.log(); console.log("Server stopping ...");
			await this.stop();
			console.log("Server stopped");
			await this.start();
		} catch (error) {
			console.log(`impossible server stop or start : ${error.message}`);
			process.exitCode = 1;
		}
	}
}

module.exports = { Server };
