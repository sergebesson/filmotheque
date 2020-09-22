"use strict";

const express = require("express");
const path = require("path");

const { OpenapiService } = require("./services/openapi.service");
const { ModulesService } = require("./services/modules.service");

async function apiRouterFactory(context) {
	const logger = context.logger;
	// eslint-disable-next-line new-cap
	const router = express.Router();

	router.use(express.json());

	await OpenapiService.install(router);

	await new ModulesService()
		.initialize({ path: path.join(__dirname, "modules"), router, context });

	router.use(OpenapiService.middlewareError({ logger }));

	routesError({ router, logger });

	return router;
}

function routesError({ router, logger }) {

	router.use((request, response) => response.status(404).json({
		status: 404, error_description: "Not Found",
	}));

	// eslint-disable-next-line no-unused-vars
	router.use((error, request, response, next) => {
		// Route d'erreur de json parser
		if (error.type === "entity.parse.failed") {
			return response.status(400).json({
				status: 400,
				error_description: "Bad Request",
				errors: [ { codeError: "badJson", messageError: "body is not json" } ],
			});
		}

		// Erreur de json-db
		if (error.reasons) {
			logger.log("error", "reasons", error.reasons);
		}

		logger.log("error", error.stack || error.message);
		response.status(500).json({
			status: 500, error_description: "Internal Server Error",
		});
	});
}

module.exports = { apiRouterFactory };
