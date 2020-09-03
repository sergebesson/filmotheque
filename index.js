"use strict";
/* eslint-disable no-console, no-process-exit*/

const { Server } = require("./server/server");

Server.createServerAndStart(process.argv[2])
	.catch((error) => {
		console.error(error.stack);
		if (error.cause) {
			console.error(error.cause);
		}
		setTimeout(() => process.exit(1), 500);
	});
