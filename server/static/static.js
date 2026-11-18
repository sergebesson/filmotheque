"use strict";

const express = require("express");

function staticRouterFactory({ configLoader }, clientDirectory) {

	// eslint-disable-next-line new-cap
	const router = express.Router();

	/* config */
	router.use("/configuration", function (request, response) {
		response.status(200).json(configLoader.getValue("vuejs", {}));
	});

	/* site */
	router.use(express.static(clientDirectory));

	return router;
}

module.exports = { staticRouterFactory };
