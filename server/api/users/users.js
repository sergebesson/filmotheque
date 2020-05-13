"use strict";

// eslint-disable-next-line node/no-unsupported-features/node-builtins
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
		this.users = {};
	}

	async load() {
		this.users = JSON.parse(await fs.readFile(this.usersFile, "utf8"));
		return this.users;
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
