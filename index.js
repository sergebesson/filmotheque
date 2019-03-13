"use strict";
/* eslint-disable no-console, no-process-exit*/

const { LoadConfiguration } = require("./services/load-configuration.js");
const { Logger } = require("./services/logger.js");
const { Server } = require("./services/server.js");

const loadConfiguration = new LoadConfiguration(process.argv[2]);
loadConfiguration.load()
	.then((configLoader) => {
		const logger = new Logger(configLoader.getValue("logs")).getLogger();
		return new Server(configLoader, logger).start();
	})
	.catch((error) => {
		console.error(error.stack);
		console.error(error.cause);
		process.exit(1);
	});
