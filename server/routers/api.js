"use strict";

const _ = require("lodash");
// eslint-disable-next-line new-cap
const router = require("express").Router();
const requireGlob = require("require-glob");
const path = require("path");

const { Users } = require("../api/users/users");

async function apiRouterFactory(context) {
	const logger = context.logger;
	const modules = await requireGlob(
		"*/*.module.js", {
			cwd: path.join(__dirname, "../api"),
			keygen: (option, fileObj) => {
				const uniquePath = fileObj.path.replace(fileObj.base, "");
				const parsedPath = path.parse(uniquePath);

				return `${parsedPath.dir}/${parsedPath.name}`.split("/").filter(Boolean);
			},
		},
	);

	await initializeModules(modules, context);

	router.use(function (request, response, next) {
		return Users.checkRouteAccessRights(request.auth.user, request.path) ?
			next() :
			response.status(403).json({
				status: 403,
				error_description: "Forbidden",
			});
	});

	loadRouterModules(modules, context);

	router.use(function (request, response) {
		return response.status(404).json({
			status: 404, error_description: "not_found",
		});
	});

	// Route d'erreur
	// eslint-disable-next-line no-unused-vars
	router.use(function (error, request, response, next) {
		logger.log("error", error.stack);
		response.status(500).json({
			status: 500, error_description: error.message,
		});
	});

	return router;
}

async function initializeModules(modules, context) {
	const promises = [];
	_.forEach(modules, (moduleList) => {
		_.forEach(moduleList, (module) => {
			if (_.isFunction(module.initialize)) {
				promises.push(module.initialize(context));
			}
		});
	});

	await Promise.all(promises);
}

function loadRouterModules(modules, context) {
	_.forEach(modules, (moduleList, pathModule) => {
		_.forEach(moduleList, (module) => {
			if (_.isFunction(module.routerFactory)) {
				const moduleRouter = module.routerFactory(context);
				router.use(`/${ pathModule }`, moduleRouter);
			}
		});
	});
}

module.exports = { apiRouterFactory };
