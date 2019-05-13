"use strict";
/* eslint-disable no-console, no-process-exit*/

const _ = require("lodash");
const { LoadConfiguration } = require("./services/load-configuration.js");
const { Logger } = require("./services/logger.js");
const { Users } = require("./services/users.js");
const { Filmotheque } = require("./services/filmotheque.js");
const { Server } = require("./services/server.js");

const loadConfiguration = new LoadConfiguration(process.argv[2]);

const context = {};
Promise.resolve()
	.then(() => loadConfiguration.load())
	.then((configLoader) => {
		const logger = new Logger(configLoader.getValue("logs")).getLogger();
		logger.log("info", "Configuration", configLoader.config);

		_.assign(context, { configLoader, logger });
		return new Users({ configLoader, logger }).load();
	})
	.then((usersJson) => {
		const users = _.mapValues(usersJson, "passwd");
		const filmotheque = new Filmotheque(
			context.configLoader.getValue("storage.databaseDirectory"), context.logger
		);
		_.assign(context, { users, filmotheque });
		return filmotheque.loadMovies();
	})
	.then(() => new Server(context).start())
	.catch((error) => {
		console.error(error.stack);
		if (error.cause) {
			console.error(error.cause);
		}
		_.delay(() => process.exit(1), 500);
	});
