"use strict";

const _ = require("lodash");
const path = require("path");

function checkQuerySort() {
	return (request, response, next) => {
		const sort = _.get(request.query, "sort");
		if (sort && sort !== "date-added") {
			return response.status(400).send({
				status: 400,
				error_description: "invalid_sort",
			});
		}
		next();
	};
}

function sendMoviesListWithPagination(filmotheque) {
	return (request, response) => {
		const search = request.query.search;
		const sort = request.query.sort;
		const pageSize = Number(_.get(request.query, "page_size", 20));
		const page = Number(_.get(request.query, "page", 1));

		if (!_.isFinite(page) || !_.isFinite(pageSize)) {
			return response.status(400).send({
				status: 400,
				error_description: !_.isFinite(page) ? "invalid_page" : "invalid_page_size",
			});
		}

		const iteratees = [ "title" ];
		const orders = [ "asc" ];
		if (sort === "date-added") {
			iteratees.unshift("dateAdded");
			orders.unshift("desc");
		}

		const movies = _.orderBy(filmotheque.find(search), iteratees, orders);
		const begin = pageSize * (page - 1);
		const end = begin + pageSize;

		response.status(200).send({
			page: page,
			total_pages: Math.ceil(movies.length / pageSize),
			total_movies: movies.length,
			movies: _.slice(movies, begin, end),
		});
	};
}

function downloadMovie(filmotheque, configLoader, logger) {
	return (request, response, next) => {
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
	};
}

module.exports = {
	checkQuerySort,
	sendMoviesListWithPagination,
	downloadMovie,
};
