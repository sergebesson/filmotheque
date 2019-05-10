"use strict";

const _ = require("lodash");
const moment = require("moment");
// eslint-disable-next-line new-cap
const router = require("express").Router();
const path = require("path");

const { Users } = require("../users.js");

module.exports = ({ filmotheque, configLoader, logger }) => {

	router.use(function (request, response, next) {
		return Users.checkRouteAccessRights(request.auth.user, request.path) ?
			next() :
			response.status(403).json({
				status: 403,
				error_description: "Forbidden",
			});
	});

	router.get("/initialize", function (request, response, next) {
		filmotheque.importMovies(configLoader.getValue("storage.moviesDirectory"))
			.then((result) => response.status(200).send(result))
			.catch(next);
	});

	router.get("/infos", function (request, response, next) {
		filmotheque.infos()
			.then((infos) => response.status(200).send(infos))
			.catch(next);
	});

	router.get("/movies", function (request, response, next) {
		if (request.query.group_by && request.query.group_by !== "dateAdded") {
			return response.status(400).send({
				status: 404, error_description: "invalid_group_by",
			});
		}

		return filmotheque.find(request.query.filter)
			.then((movies) => {
				const moviesResult = request.query.group_by === "dateAdded" ?
					_.chain(movies)
						.sortBy("dateAdded")
						.reverse()
						.groupBy((movie) => moment(movie.dateAdded).set({
							hour: 0, minute: 0, second: 0, millisecond: 0,
						}).toISOString())
						.value() :
					movies;
				response.status(200).send(moviesResult);
			})
			.catch(next);
	});

	router.get("/download/:id", function (request, response, next) {
		filmotheque.get(request.params.id)
			.then((movie) => {
				if (!movie) {
					return next();
				}
				response.download(
					path.join(configLoader.getValue("storage.moviesDirectory"), movie.fileName)
				);
			})
			.catch(next);
	});

	router.use(function (request, response) {
		return response.status(404).json({
			status: 404, error_description: "not_found",
		});
	});

	// Route d'erreur
	// eslint-disable-next-line no-unused-vars
	router.use(function (error, request, response, next) {
		logger.log("error", error.stack);
		response.status(500).json({
			status: 500, error_description: error.message,
		});
	});

	return router;
};
