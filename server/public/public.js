"use strict";

const express = require("express");

function publicRouterFactory() {

	// eslint-disable-next-line new-cap
	const router = express.Router();

	router.get("/logout", (request, response) => response.status(200).send(`
		<html>
			<body>
				<h1>Vous êtes déconnecté</h1>
			</body>
		</html>
	`),
	);

	return router;
}

module.exports = { publicRouterFactory };
