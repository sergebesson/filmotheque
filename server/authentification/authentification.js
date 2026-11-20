"use strict";

const express = require("express");
const expressBasicAuth = require("express-basic-auth");

async function authentificationRouterFactory({ usersStore }) {
	// eslint-disable-next-line new-cap
	const router = express.Router();

	router.use((request, response, next) => expressBasicAuth({
		authorizer: (name, password) => {
			const uuid = usersStore.authenticate({ name, password });
			if (uuid === null) {
				return false;
			}
			request.auth.uuid = uuid;
			return true;
		},
		challenge: true,
	})(request, response, next));

	return router;
}

module.exports = { authentificationRouterFactory };
