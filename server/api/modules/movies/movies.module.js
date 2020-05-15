"use strict";

const express = require("express");

const { sendMoviesListWithPagination, downloadMovie } = require("./movies.middleware");

const authorizedRoutes = {
	admin: [ "/initialize" ],
	all: [ "/?", "/[^/]+/download" ],
};

function routerFactory({ moviesStore, configLoader, logger }) {
	// eslint-disable-next-line new-cap
	const router = express.Router();

	router.post("/initialize", (request, response, next) => moviesStore
		.importMovies({ directory: configLoader.getValue("storage.moviesDirectory") })
		.then((result) => response.status(200).json(result))
		.catch(next),
	);

	router.get("/", sendMoviesListWithPagination({ moviesStore }));

	router.get("/:id/download", downloadMovie({ moviesStore, configLoader, logger }));

	return router;
}

module.exports = {
	authorizedRoutes,
	routerFactory,
};
