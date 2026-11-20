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
const { Database } = require("./services/database.js");

const { publicRouterFactory } = require("./public/public.js");
const { authentificationRouterFactory } = require("./authentification/authentification.js");
const { staticRouterFactory } = require("./static/static.js");
const { apiRouterFactory } = require("./api/api.js");

class Server {

	static async createServerAndStart(configurationFile) {
		const server = new Server();
		try {
			await server.initialize(configurationFile);
			await server.start();
			return server;
		} catch (error) {
			await server.close();
			throw error;
		}
	}

	constructor() {
		this.logger = null;
		this.configuration = null;
		this.app = express();
		this.server = null;
		this.context = null;
		this.closing = null;
		this.startPromise = null;
		this.stopPromise = null;
		this.handleExitSignalBind = () => this.handleExitSignal();
		this.handleReloadSignalBind = () => this.handleReloadSignal();
	}

	async initialize(configurationFile) {
		const context = await Server.initializeContext({ configurationFile });
		this.context = context;
		this.logger = context.logger;
		this.configuration = context.configLoader.getValue("server");

		try {
			this.app.use(compression());
			this.app.use((request, response, next) =>
				this.checkUrlServerMiddleware(request, response, next));
			const clientDirectory = path.join(__dirname, "../www/dist");
			this.app.use(favicon(path.join(clientDirectory, "filmotheque.ico")));
			this.app.use(publicRouterFactory(context));
			this.app.use(await authentificationRouterFactory(context));
			this.app.use(staticRouterFactory(context, clientDirectory));
			this.app.use("/api", await apiRouterFactory(context));

			// Route d'erreur
			this.app.use((error, request, response, next) =>
				this.errorMiddleware(error, request, response, next));
		} catch (error) {
			await this.close();
			throw error;
		}
	}

	static async initializeContext({ configurationFile }) {
		const loadConfiguration = new LoadConfiguration(configurationFile);
		const configLoader = await loadConfiguration.load();

		const logger = new Logger(configLoader.getValue("logs")).getLogger();
		logger.log("info", "Configuration", configLoader.config);

		const context = {
			configLoader,
			logger,
			database: await Database.open({ configLoader }),
		};

		try {
			const stores = await requireGlob("stores/*.store.js", { cwd: __dirname });
			const instances = _.map(stores, (store, storeName) => {
				context[storeName] = new store[
					storeName.charAt(0).toUpperCase() + storeName.slice(1)
				](context);
				return context[storeName];
			});
			const results = await Promise.allSettled(instances
				.map(async(store) => store.initialize()));
			const failure = results.find((result) => result.status === "rejected");
			if (failure) {
				throw failure.reason;
			}
			return context;
		} catch (error) {
			await context.database.close();
			throw error;
		}
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
		if (this.closing) {
			return Promise.reject(new Error("Server is closed"));
		}
		if (this.startPromise) {
			return this.startPromise;
		}
		if (this.stopPromise) {
			console.log();
			return Promise.reject(new Error("Server is shutting down"));
		}

		console.log();
		console.log("Server starting ...");
		this.startPromise = new Promise((resolve, reject) => {
			this.server = this.configuration.ssl.enable ?
				https.createServer({
					/* eslint-disable-next-line no-sync */
					key: fs.readFileSync(this.configuration.ssl.keyFile),
					/* eslint-disable-next-line no-sync */
					cert: fs.readFileSync(this.configuration.ssl.certFile),
				}, this.app) :
				http.createServer(this.app);
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

				if (!process.listeners("SIGINT").includes(this.handleExitSignalBind)) {
					process.on("SIGINT", this.handleExitSignalBind);
					process.on("SIGTERM", this.handleExitSignalBind);
					process.on("SIGUSR1", this.handleReloadSignalBind);
				}

				resolve();
			});
			this.server.listen({
				port: this.configuration.port,
				host: this.configuration.host,
			});
		}).finally(() => {
			this.startPromise = null;
		});
		return this.startPromise;
	}

	stop() {
		if (this.stopPromise) {
			return this.stopPromise;
		}
		if (this.startPromise) {
			return this.startPromise.then(() => this.stop(), () => this.stop());
		}
		console.log(); console.log("Server stopping ...");
		if (!this.server?.listening) {
			this.server = null;
			return Promise.resolve();
		}

		const timeoutCloseAllConnection = setTimeout(() => {
			this.logger.log("info", "forcing close all connections");
			this.server?.closeAllConnections();
		}, this.configuration.closeTimeoutInMin * 60 * 1000);

		this.stopPromise = new Promise((resolve, reject) => {
			this.server.on("error", (error) => {
				const messageError = `Server not closed : ${error.message}`;
				console.log(messageError);
				this.logger.log("error", messageError);
				reject(error);
			});
			this.server.on("close", () => {
				console.log("Server stopped");
				this.logger.log("info", "Server is closed");
				this.server = null;
				resolve();
			});
			this.server.closeIdleConnections();
			this.server.close();
		}).finally(() => {
			clearTimeout(timeoutCloseAllConnection);
			this.stopPromise = null;
		});
		return this.stopPromise;
	}

	close() {
		if (!this.closing) {
			this.closing = (async() => {
				try {
					await this.stop();
				} finally {
					try {
						await this.context?.database.close();
					} finally {
						process.removeListener("SIGINT", this.handleExitSignalBind);
						process.removeListener("SIGTERM", this.handleExitSignalBind);
						process.removeListener("SIGUSR1", this.handleReloadSignalBind);
					}
				}
			})();
		}
		return this.closing;
	}

	async handleExitSignal() {
		console.log(); console.log("Exit Signal receive");
		try {
			await this.close();
			process.exitCode = 0;
		} catch (error) {
			console.log(`impossible server stop : ${error.message}`);
			process.exitCode = 1;
			// eslint-disable-next-line no-process-exit
			setTimeout(() => process.exit(1), 1000);
		}
	}

	async handleReloadSignal() {
		try {
			console.log(); console.log("Reload Signal receive");
			await this.stop();
			if (!this.closing) {
				await this.start();
			}
		} catch (error) {
			console.log(`impossible server stop or start : ${error.message}`);
			await this.handleExitSignal();
			process.exitCode = 1;
		}
	}
}

module.exports = { Server };
