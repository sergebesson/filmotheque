"use strict";

const fs = require("fs").promises;

class Users {
	static get authorizedRoutes() {
		return [
			"/infos",
			"/movies",
			"/download",
		];
	}
	constructor({ configLoader, logger }) {
		this.logger = logger;
		this.usersFile = configLoader.getValue("storage.usersFile");
	}

	load() {
		return fs.readFile(this.usersFile, "utf8")
			.then((users) => JSON.parse(users));
	}

	static checkRouteAccessRights(user, route) {
		if (user === "serge") {
			return true;
		}

		return Users.authorizedRoutes.some((authorizedRoute) => {
			return RegExp(`^${authorizedRoute}`).test(route);
		});
	}
}

module.exports = { Users };
