"use strict";

const express = require("express");
const path = require("path");
// eslint-disable-next-line new-cap
const router = express.Router();

module.exports = router;

function staticMiddleware(directory) {
	return express.static(path.join(__dirname, "../..", directory));
}

/* vue.js */
router.use("/libs/vue.js", staticMiddleware("node_modules/vue/dist/vue.min.js"));

/* vue matériel */
router.use("/css/vue-material.css",
	staticMiddleware("node_modules/vue-material/dist/vue-material.min.css"));
router.use("/css/vue-material/theme/default.css",
	staticMiddleware("node_modules/vue-material/dist/theme/default.css"));
router.use("/libs/vue-material.js",
	staticMiddleware("node_modules/vue-material/dist/vue-material.min.js"));

/* lodash */
router.use("/libs/lodash.js", staticMiddleware("node_modules/lodash/lodash.min.js"));

/* moment */
router.use("/libs/moment.js", staticMiddleware("node_modules/moment/min/moment.min.js"));
router.use("/libs/moment/locale/fr.js", staticMiddleware("node_modules/moment/locale/fr.js"));

/* axios */
router.use("/libs/axios.js", staticMiddleware("node_modules/axios/dist/axios.min.js"));

/* byte-size */
router.use("/libs/byte-size.js", staticMiddleware("node_modules/byte-size/dist/index.js"));

/* site */
router.use(staticMiddleware("www"));
