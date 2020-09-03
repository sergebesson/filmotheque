"use strict";

const express = require("express");

const { sendUsersListWithPagination } = require("./users.middleware");

const authorizedRoutes = {
	admin: [ "/?", "/[^/]+" ],
	all: [ "/me", "/[^/]+/avatar" ],
};

function routerFactory({ usersStore }) {
	// eslint-disable-next-line new-cap
	const router = express.Router();

	router.get("/me", (request, response, next) => {
		const loginUser = usersStore.loginUser;
		if (loginUser === null) {
			return next(new Error("GET /me, loginUser not set"));
		}
		response.status(200).json(loginUser.jsonPublic);
	});

	router.get("/", sendUsersListWithPagination({ usersStore }));

	router.head("/:name", (request, response) => {
		const user = usersStore.getUserByName({ name: request.params.name });
		if (user === null) {
			return response.sendStatus(404);
		}
		response.sendStatus(204);
	});

	router.get("/:name", (request, response) => {
		const user = usersStore.getUserByName({ name: request.params.name });
		if (user === null) {
			return response.status(404).json({
				status: 404,
				error_description: "Not Found",
			});
		}
		response.status(200).json(user.json);
	});

	router.post("/", (request, response, next) => usersStore.insert({
		name: request.body.name,
		password: request.body.password,
		pseudo: request.body.pseudo,
		active: request.body.active,
		description: request.body.description,
		sexe: request.body.sexe,
		avatar_id: request.body.avatar_id,
		avatar_format: request.body.avatar_format,
	})
		.then((user) => response.status(201).json(user.json))
		.catch((error) => error.message === "alreadyExists" ?
			response.status(400).json({
				status: 400,
				error_description: "Bad Request",
				errors: [ { errorCode: "alreadyExists", message: "user already exists" } ],
			}) :
			next(error),
		),
	);

	router.patch("/:name", (request, response, next) => usersStore.update({
		name: request.params.name,
		password: request.body.password,
		pseudo: request.body.pseudo,
		active: request.body.active,
		description: request.body.description,
		sexe: request.body.sexe,
		avatar_id: request.body.avatar_id,
		avatar_format: request.body.avatar_format,
	})
		.then((user) => response.status(200).json(user.json))
		.catch((error) => error.message === "userNotfound" ?
			response.status(404).json({
				status: 404,
				error_description: "Not Found",
			}) :
			next(error),
		),
	);

	router.delete("/:name", (request, response, next) => usersStore.delete({
		name: request.params.name,
	})
		.then(() => response.sendStatus(204))
		.catch((error) => {
			if (error.message === "userNotfound") {
				return response.status(404).json({
					status: 404,
					error_description: "Not Found",
				});
			}
			if (error.message === "unauthorized") {
				return response.status(401).json({
					status: 401,
					error_description: "Unauthorized",
				});
			}

			next(error);
		}),
	);

	router.get("/:name/avatar", (request, response) => {
		const user = usersStore.getUserByName({ name: request.params.name });
		if (user === null) {
			return response.status(404).json({
				status: 404,
				error_description: "Not Found",
			});
		}
		response.sendFile(user.avatarFile);
	});

	return router;
}

module.exports = {
	authorizedRoutes,
	routerFactory,
};
