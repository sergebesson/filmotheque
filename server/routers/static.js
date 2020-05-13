"use strict";

const express = require("express");
const path = require("path");
// eslint-disable-next-line new-cap
const router = express.Router();

function staticMiddleware(directory) {
	return express.static(path.join(__dirname, "../..", directory));
}

function staticRouterFactory({ configLoader }) {

	const debug = configLoader.getValue("vuejs.debug", false);

	/* vue.js */
	if (debug) {
		router.use("/libs/vue/vue.min.js", staticMiddleware("node_modules/vue/dist/vue.js"));
	}
	router.use("/libs/vue", staticMiddleware("node_modules/vue/dist"));

	/* vue matériel */
	router.use("/libs/vue-material", staticMiddleware("node_modules/vue-material/dist"));

	/* lodash */
	router.use("/libs/lodash", staticMiddleware("node_modules/lodash"));

	/* moment */
	router.use("/libs/moment/locale", staticMiddleware("node_modules/moment/locale"));
	router.use("/libs/moment", staticMiddleware("node_modules/moment/min"));

	/* axios */
	router.use("/libs/axios", staticMiddleware("node_modules/axios/dist"));

	/* byte-size */
	router.use("/libs/byte-size", staticMiddleware("node_modules/byte-size/dist"));

	/* config */
	router.use("/configuration", function (request, response) {
		response.status(200).send(configLoader.getValue("vuejs", {}));
	});

	/* site */
	router.use(staticMiddleware("www"));

	return router;
}

module.exports = { staticRouterFactory };
