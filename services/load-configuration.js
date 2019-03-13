"use strict";

const _ = require("lodash");
const path = require("path");
const { ConfigLoader } = require("sb-configuration-loader");

class LoadConfiguration {
	constructor(configurationFile) {
		this.file = LoadConfiguration
			.updateRelativeStorage(configurationFile || "data/configuration.json");
	}

	static updateRelativeStorage(directory) {
		return directory.startsWith("/") ? directory : path.join(__dirname, "..", directory);
	}

	load() {
		const configLoader = new ConfigLoader();
		return configLoader.load([ {
			type: "file",
			file: this.file,
		}, {
			type: "environment",
			mapping: {
				PORT: "server.port",
				DIR_FILMS: "storage.films",
				DIR_FILMOTHEQUE: "storage.filmotheque",
				LOGS_LEVEL: "logs.level",
			},
		} ]).then(() => {
			if (configLoader.hasLayersInError()) {
				const error = new Error("Le chargement de la configuration à rencontrer une erreur");
				error.cause = configLoader.getLayersInError();
				return Promise.reject(error);
			}

			_.forEach(configLoader.config.storage,
				(directory, key) => {
					configLoader.config.storage[key] =
						LoadConfiguration.updateRelativeStorage(directory);
				}
			);

			return configLoader;
		});
	}
}

module.exports = { LoadConfiguration };
