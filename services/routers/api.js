"use strict";

const _ = require("lodash");
// eslint-disable-next-line new-cap
const router = require("express").Router();
const path = require("path");

const { Users } = require("../users.js");

module.exports = ({ filmotheque, configLoader, logger }) => {

	function checkQueryPagination(query) {
		const pageSize = Number(_.get(query, "page_size", 20));
		const page = Number(_.get(query, "page", 1));

		if (!_.isFinite(page) || !_.isFinite(pageSize)) {
			return {
				success: false,
				codeError: !_.isFinite(page) ? "invalid_page" : "invalid_page_size",
			};
		}

		return {
			success: true,
			pageSize,
			page,
		};
	}

	function buildMoviesListWithPagination({ pageSize, page, movies }) {
		const begin = pageSize * (page - 1);
		const end = begin + pageSize;
		return {
			page: page,
			total_pages: Math.ceil(movies.length / pageSize),
			total_movies: movies.length,
			movies: _.slice(movies, begin, end),
		};
	}

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

	router.get("/movies", function (request, response) {
		const sort = _.get(request.query, "sort");
		if (sort && sort !== "date-added") {
			return response.status(400).send({
				status: 400,
				error_description: "invalid_sort",
			});
		}

		const checkPagination = checkQueryPagination(request.query);
		if (!checkPagination.success) {
			return response.status(400).send({
				status: 400,
				error_description: checkPagination.codeError,
			});
		}
		const { pageSize, page } = checkPagination;

		const iteratees = [ "title" ];
		const orders = [ "asc" ];
		if (sort === "date-added") {
			iteratees.unshift("dateAdded");
			orders.unshift("desc");
		}

		const movies = _.orderBy(filmotheque.find(request.query.search), iteratees, orders);

		response.status(200).send(buildMoviesListWithPagination({ pageSize, page, movies }));
	});

	router.get("/download/:id", function (request, response, next) {
		const movie = filmotheque.get(request.params.id);
		if (!movie) {
			return next();
		}
		response.on("finish", () => {
			logger.log("debug", `${request.auth.user} stops download '${movie.fileName}'`);
		});
		response.download(
			path.join(configLoader.getValue("storage.moviesDirectory"), movie.fileName),
		);
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
