"use strict";

const express = require("express");

const authorizedRoutes = {
	all: [ "/?" ],
};

function routerFactory({ infosStore }) {

	// eslint-disable-next-line new-cap
	const router = express.Router();

	router.get("/", (request, response, next) => infosStore.get()
		.then((infos) => response.status(200).json(infos))
		.catch(next),
	);

	return router;
}


module.exports = {
	authorizedRoutes,
	routerFactory,
};
