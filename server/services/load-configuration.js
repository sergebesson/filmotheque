"use strict";

const path = require("path");
const { ConfigLoader } = require("@sbesson/configuration-loader");

class LoadConfiguration {
	constructor(configurationFile) {
		this.file = !configurationFile || configurationFile.startsWith("/") ?
			configurationFile :
			path.join(process.cwd(), configurationFile);
	}

	async load() {
		const configLoader = new ConfigLoader();
		const layers = [ {
			type: "file",
			file: path.join(__dirname, "../../data/configuration.json"),
		} ];
		if (this.file) {
			layers.push({
				type: "file",
				file: this.file,
			});
		}
		layers.push({
			type: "environment",
			mapping: {
				PORT: { type: "number", path: "server.port" },
				HOST: "server.host",
				URL_SERVER: "server.url_server",
				SSL_ENABLE: { type: "boolean", path: "server.ssl.enable" },
				MOVIES_DIR: "storage.moviesDirectory",
				DB_DIR: "storage.databaseDirectory",
				USER_FILE: "storage.usersFile",
				LOGS_LEVEL: "logs.level",
				LOGS_FILE: "logs.file",
			},
		});
		await configLoader.load(layers);

		if (configLoader.hasLayersInError()) {
			const error = new Error("Le chargement de la configuration à rencontrer une erreur");
			error.cause = configLoader.getLayersInError();
			throw error;
		}

		return configLoader;
	}
}

module.exports = { LoadConfiguration };
