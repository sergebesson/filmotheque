"use strict";
/* eslint-disable no-console, no-process-exit*/

const _ = require("lodash");
const { LoadConfiguration } = require("./services/load-configuration.js");
const { Logger } = require("./services/logger.js");
const { Users } = require("./services/users.js");
const { Server } = require("./services/server.js");

const loadConfiguration = new LoadConfiguration(process.argv[2]);
loadConfiguration.load()
	.then((configLoader) => {
		const logger = new Logger(configLoader.getValue("logs")).getLogger();
		logger.log("info", "Configuration", configLoader.config);

		return new Users({ configLoader, logger }).load()
			.then((users) => new Server(
				{ configLoader, logger, users: _.mapValues(users, "passwd") }).start());

	})
	.catch((error) => {
		console.error(error.stack);
		if (error.cause) {
			console.error(error.cause);
		}
		_.delay(() => process.exit(1), 500);
	});
