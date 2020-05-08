"use strict";

const express = require("express");
const path = require("path");
// eslint-disable-next-line new-cap
const router = express.Router();

function staticMiddleware(directory) {
	return express.static(path.join(__dirname, "../..", directory));
}

module.exports = () => {

	/* vue.js */
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

	/* site */
	router.use(staticMiddleware("www"));

	return router;
};
