"use strict";

const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const expressBasicAuth = require("express-basic-auth");

const staticRoutes = require("./routers/static.js");
const apiRoutesFactory = require("./routers/api.js");

class Server {

	constructor(context) {
		const { configLoader, logger, users } = context;
		this.logger = logger;
		this.configuration = configLoader.getValue("server");

		const routeApi = apiRoutesFactory(context);

		this.app = express();

		this.app.use((request, response, next) =>
			this.checkUrlServerMiddleware(request, response, next));

		this.app.use(expressBasicAuth({ users, challenge: true }));

		this.app.use(staticRoutes);
		this.app.use("/api", routeApi);

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
				} ${this.configuration.ssl.enable ? "in ssl mode" : ""}`
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
							/* eslint-disable-next-line no-process-exit */
							process.exit(0);
						})
						.catch((error) => {
							/* eslint-disable-next-line no-console */
							console.log(`impossible server stop : ${error.message}`);
							/* eslint-disable-next-line no-process-exit */
							process.exit(1);
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
