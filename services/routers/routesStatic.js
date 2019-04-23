"use strict";

const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();

module.exports = router;

/* vue.js */
router.use("/libs/vue.js", express.static("node_modules/vue/dist/vue.min.js"));

/* vue matériel */
router.use("/css/vue-material.css",
	express.static("node_modules/vue-material/dist/vue-material.min.css"));
router.use("/css/vue-material/theme/default.css",
	express.static("node_modules/vue-material/dist/theme/default.css"));
router.use("/libs/vue-material.js",
	express.static("node_modules/vue-material/dist/vue-material.min.js"));

/* lodash */
router.use("/libs/lodash.js",
	express.static("node_modules/lodash/lodash.min.js"));

/* moment */
router.use("/libs/moment.js",
	express.static("node_modules/moment/min/moment.min.js"));
router.use("/libs/moment/locale/fr.js",
	express.static("node_modules/moment/locale/fr.js"));

/* axios */
router.use("/libs/axios.js",
	express.static("node_modules/axios/dist/axios.min.js"));

/* byte-size */
router.use("/libs/byte-size.js",
	express.static("node_modules/byte-size/dist/index.js"));

/* site */
router.use(express.static("www"));
