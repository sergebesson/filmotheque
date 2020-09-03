"use strict";

const _ = require("lodash");
const path = require("path");

function sendMoviesListWithPagination({ moviesStore }) {
	return (request, response) => {
		const search = request.query.search;
		const sort = request.query.sort;
		const pageSize = request.query.page_size;
		const page = request.query.page;

		const iteratees = [ "title" ];
		const orders = [ "asc" ];
		if (sort === "date-added") {
			iteratees.unshift("date_added");
			orders.unshift("desc");
		}

		const movies = _.orderBy(moviesStore.search({ search }), iteratees, orders);
		const begin = pageSize * (page - 1);
		const end = begin + pageSize;

		response.status(200).json({
			page: page,
			page_size: pageSize,
			total_pages: Math.ceil(movies.length / pageSize),
			total_movies: movies.length,
			movies: _.slice(movies, begin, end),
		});
	};
}

function downloadMovie({ moviesStore, configLoader, logger }) {
	return (request, response, next) => {
		const movie = moviesStore.get({ id: request.params.id });
		if (!movie) {
			return next();
		}
		response.on("finish", () => {
			logger.log("debug", `${request.auth.user} stops download '${movie.file_name}'`);
		});
		response.download(
			path.join(configLoader.getValue("storage.moviesDirectory"), movie.file_name),
		);
	};
}

module.exports = {
	sendMoviesListWithPagination,
	downloadMovie,
};
