"use strict";
/* eslint-disable no-console */

const yargs = require("yargs");
const { LoadConfiguration } = require("../server/services/load-configuration");
const { Database } = require("../server/services/database");
const { UsersStore } = require("../server/stores/users.store");

async function rebuildUsersLoginIndex({ config }) {
	const configLoader = await new LoadConfiguration(config).load();
	const database = await Database.open({ configLoader });
	try {
		return await new UsersStore({ database }).rebuildLoginIndex();
	} finally {
		await database.close();
	}
}

if (require.main === module) {
	const params = yargs
		.locale("fr")
		.usage("usage : $0 --config <fichier>")
		.epilog("Exécuter application arrêtée. Reconstruit uniquement l’index, sans modifier les comptes ni les JSON.")
		.option("config", {
			describe: "fichier de configuration de la destination LMDB",
			alias: "c",
			type: "string",
			requiresArg: true,
			demandOption: true,
		})
		.strict()
		.wrap(100)
		.help()
		.argv;
	rebuildUsersLoginIndex(params)
		.then(({ number_indexed_users: count }) => {
			console.log(`Index des logins reconstruit : ${count} comptes ; comptes et JSON inchangés.`);
		})
		.catch((error) => {
			console.error(error.message);
			process.exitCode = 1;
		});
}

module.exports = { rebuildUsersLoginIndex };
