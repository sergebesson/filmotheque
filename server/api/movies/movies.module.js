"use strict";

// eslint-disable-next-line new-cap
const router = require("express").Router();

const { Filmotheque } = require("./filmotheque");

const { checkQuerySort, sendMoviesListWithPagination, downloadMovie } = require("./movies.middleware");

function routerFactory({ filmotheque, configLoader, logger }) {
	router.get("/initialize", function (request, response, next) {
		filmotheque.importMovies(configLoader.getValue("storage.moviesDirectory"))
			.then((result) => response.status(200).send(result))
			.catch(next);
	});

	router.get("/", checkQuerySort(), sendMoviesListWithPagination(filmotheque));

	router.get("/:id/download", downloadMovie(filmotheque, configLoader, logger));

	return router;
}

async function initialize(context) {
	context.filmotheque = new Filmotheque(
		context.configLoader.getValue("storage.databaseDirectory"), context.logger,
	);
	await context.filmotheque.loadMovies();
}

module.exports = {
	routerFactory,
	initialize,
};
