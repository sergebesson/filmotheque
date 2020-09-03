"use strict";

const express = require("express");
const path = require("path");

function staticMiddleware(directory) {
	return express.static(path.join(__dirname, "../../node_modules", directory));
}

function staticRouterFactory({ configLoader }) {

	const debug = configLoader.getValue("vuejs.debug", false);
	// eslint-disable-next-line new-cap
	const router = express.Router();

	/* animate.css */
	router.use("/libs/animate", staticMiddleware("animate.css"));

	/* vue.js */
	if (debug) {
		router.use("/libs/vue/vue.min.js", staticMiddleware("vue/dist/vue.js"));
	}
	router.use("/libs/vue", staticMiddleware("vue/dist"));

	/* vue router */
	if (debug) {
		router.use(
			"/libs/vue/vue-router.min.js", staticMiddleware("vue-router/dist/vue-router.js"),
		);
	}
	router.use("/libs/vue-router", staticMiddleware("vue-router/dist"));

	/* vue matériel */
	router.use("/libs/vue-material", staticMiddleware("vue-material/dist"));

	/* vuelidate */
	router.use("/libs/vuelidate", staticMiddleware("vuelidate/dist"));

	/* lodash */
	router.use("/libs/lodash", staticMiddleware("lodash"));

	/* moment */
	router.use("/libs/moment/locale", staticMiddleware("moment/locale"));
	router.use("/libs/moment", staticMiddleware("moment/min"));

	/* axios */
	router.use("/libs/axios", staticMiddleware("axios/dist"));

	/* byte-size */
	router.use("/libs/byte-size", staticMiddleware("byte-size/dist"));

	/* object-hash */
	router.use("/libs/object-hash", staticMiddleware("object-hash/dist"));

	/* config */
	router.use("/configuration", function (request, response) {
		response.status(200).json(configLoader.getValue("vuejs", {}));
	});

	/* site */
	router.use(staticMiddleware("../www"));

	return router;
}

module.exports = { staticRouterFactory };
