"use strict";

const express = require("express");

const { Filmotheque } = require("./filmotheque.js");

class Server {
	constructor(configLoader, logger) {
		this.configLoader = configLoader;
		this.logger = logger;
		this.configuration = configLoader.getValue("server");

		const filmotheque = new Filmotheque(configLoader.getValue("storage.filmotheque"), logger);

		this.app = express();
		this.app.get("/api/initialize", function (req, res) {
			filmotheque.initialize(configLoader.getValue("storage.films"))
				.then((result) => res.status(200).send(result))
				.catch((error) => {
					logger.log("error", error.stack);
					res.status(500).send(error.message);
				});
		});

		this.app.get("/api/films", function (req, res) {
			filmotheque.find(req.query)
				.then((films) => res.status(200).send(films))
				.catch((error) => {
					logger.log("error", error.stack);
					res.status(500).send(error.message);
				});
		});
	}

	start() {
		this.logger.log("info", `start server with port : ${ this.configuration.port }`);
		this.app.listen(this.configuration.port);
	}
}

module.exports = { Server };
