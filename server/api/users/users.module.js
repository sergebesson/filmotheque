"use strict";

// eslint-disable-next-line new-cap
const router = require("express").Router();

const { Users } = require("./users");

function routerFactory() {
	return router;
}

async function initialize(context) {
	context.users = new Users(context);
	await context.users.load();
}

module.exports = {
	routerFactory,
	initialize,
};
