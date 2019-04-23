"use strict";

const path = require("path");
const { ConfigLoader } = require("sb-configuration-loader");

class LoadConfiguration {
	constructor(configurationFile) {
		this.file = configurationFile;
	}

	load() {
		const configLoader = new ConfigLoader();
		const layers = [ {
			type: "file",
			file: path.join(__dirname, "../data/configuration.json"),
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
				PORT: "server.port",
				HOST: "server.host",
				URL_SERVER: "server.url_server",
				SSL_ENABLE: "server.ssl.enable",
				MOVIES_DIR: "storage.moviesDirectory",
				DB_DIR: "storage.databaseDirectory",
				LOGS_LEVEL: "logs.level",
				LOGS_FILE: "logs.file",
			},
		});
		return configLoader.load(layers)
			.then(() => {
				if (configLoader.hasLayersInError()) {
					const error = new Error("Le chargement de la configuration à rencontrer une erreur");
					error.cause = configLoader.getLayersInError();
					return Promise.reject(error);
				}

				return configLoader;
			});
	}
}

module.exports = { LoadConfiguration };
