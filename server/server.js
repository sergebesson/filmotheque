"use strict";

const _ = require("lodash");
const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const expressBasicAuth = require("express-basic-auth");

const { LoadConfiguration } = require("./services/load-configuration.js");
const { Logger } = require("./services/logger.js");

const { staticRouterFactory } = require("./routers/static.js");
const { apiRouterFactory } = require("./routers/api.js");

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
	}

	async initialize(configurationFile) {
		const loadConfiguration = new LoadConfiguration(configurationFile);
		const configLoader = await loadConfiguration.load();

		const logger = new Logger(configLoader.getValue("logs")).getLogger();
		logger.log("info", "Configuration", configLoader.config);

		const context = {
			configLoader,
			logger,
			// les modules
			filmotheque: null,
			users: null,
		};

		this.logger = logger;
		this.configuration = configLoader.getValue("server");

		const staticRouter = staticRouterFactory(context);
		const apiRouter = await apiRouterFactory(context);


		this.app.use((request, response, next) =>
			this.checkUrlServerMiddleware(request, response, next));

		this.app.use(expressBasicAuth({ users: _.mapValues(context.users.users, "passwd"), challenge: true }));

		this.app.use(staticRouter);
		this.app.use("/api", apiRouter);

		// Route d'erreur
		this.app.use((error, request, response, next) =>
			this.errorMiddleware(error, request, response, next));
	}

	start() {
		/* eslint-disable-next-line no-console */
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
				/* eslint-disable-next-line no-console */
				console.log(messageError);
				this.logger.log("error", messageError);
				reject(error);
			});
			this.server.on("listening", () => {
				/* eslint-disable-next-line no-console */
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

				process.on("SIGINT", () => {
					/* eslint-disable-next-line no-console */
					console.log(); console.log("Server stopping ...");
					this.stop()
						.then(() => {
							/* eslint-disable-next-line no-console */
							console.log("Server stopped");
							process.exitCode = 0;
						})
						.catch((error) => {
							/* eslint-disable-next-line no-console */
							console.log(`impossible server stop : ${error.message}`);
							/* eslint-disable-next-line no-process-exit */
							process.exitCode = 1;
						});
				});

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
				resolve();
			});
			this.server.close();
		});
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
}

module.exports = { Server };
