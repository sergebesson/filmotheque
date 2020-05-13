"use strict";

// eslint-disable-next-line new-cap
const router = require("express").Router();

const { InfosService } = require("./infos.service");

function routerFactory({ filmotheque, logger }) {

	const infosService = new InfosService({ filmotheque, logger });

	router.get("/", function (request, response, next) {
		infosService.get()
			.then((infos) => response.status(200).send(infos))
			.catch(next);
	});

	return router;
}


module.exports = {
	routerFactory,
};
