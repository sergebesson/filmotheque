#!/usr/bin/env node
"use strict";

/* eslint-disable no-console, no-sync */

const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const _ = require("lodash");
const yargs = require("yargs");

const { LoadConfiguration } = require("../server/services/load-configuration.js");
const { Database } = require("../server/services/database.js");
const { UsersStore } = require("../server/stores/users.store");

function validateAndReturnParams() {
	return yargs
		.locale("fr")
		.usage("usage : $0 [options]")
		.epilog("Exécuter application arrêtée. Destination vide ou seul compte initial inchangé. JSON conservés.")
		.option("config", {
			describe: "fichier de configuration de la destination LMDB",
			alias: "c",
			type: "string",
			requiresArg: true,
			demandOption: true,
		})
		.option("file", {
			describe: "fichier users.documents.json source (format json-db)",
			alias: "f",
			type: "string",
			requiresArg: true,
			demandOption: true,
		})
		.strict()
		.wrap(100)
		.help()
		.argv;
}

class Migration {
	constructor({ file, config }) {
		this.file = file;
		this.loadConfiguration = new LoadConfiguration(config);
	}
	async execute() {
		const configLoader = await this.loadConfiguration.load();
		const users = JSON.parse(await fs.readFile(this.file, "utf8"));
		if (!_.isPlainObject(users) || Object.keys(users).length === 0) {
			throw new Error("La source doit être une collection json-db de comptes non vide");
		}
		const documents = Object.entries(users).map(([ name, document ]) => {
			if (!_.isPlainObject(document) || document.name !== name) {
				throw new Error("Compte source invalide : le nom doit correspondre à la clé json-db");
			}
			return _.omit(document, "__private__");
		});
		const database = await Database.open({ configLoader });
		try {
			const usersStore = new UsersStore({ database });
			for (const document of documents) {
				usersStore.validateUser(document);
			}
			database.root.transactionSync(() => {
				const userCount = database.users.getCount();
				if (userCount !== 0) {
					const initial = userCount === 1 ?
						usersStore.resolve(UsersStore.initialUser.name) : null;
					if (!initial || !isDeepStrictEqual(initial.user, UsersStore.initialUser)) {
						throw new Error("Migration refusée : la base de comptes n’est pas vide et ne correspond pas au seul compte initial inchangé");
					}
					database.users.removeSync(initial.uuid);
					database.usersByLogin.removeSync(initial.hash);
				}
				for (const document of documents) {
					const { hash, uuid } = usersStore.resolve(document.name);
					const userId = randomUUID();
					if (uuid !== undefined || database.users.get(userId) !== undefined) {
						throw new Error("Migration refusée : identité de compte déjà présente");
					}
					database.users.putSync(userId, document);
					database.usersByLogin.putSync(hash, userId);
				}
			});
			await database.flush();
			if (database.users.getCount() !== documents.length ||
				database.usersByLogin.getCount() !== documents.length ||
				documents.some((document) =>
					!isDeepStrictEqual(usersStore.resolve(document.name).user, document))) {
				throw new Error("Vérification échouée après commit LMDB : ne pas relancer la migration");
			}
		} catch (error) {
			try {
				await database.close();
			} catch (closeError) {
				throw new AggregateError([ error, closeError ],
					`${error.message} ; échec de fermeture LMDB : ${closeError.message}`);
			}
			throw error;
		}
		try {
			await database.close();
		} catch (cause) {
			throw new Error(`Échec de fermeture après commit LMDB : ${cause.message}`, { cause });
		}
		console.log(`Migration vérifiée : ${documents.length} comptes ; fichiers JSON conservés.`);
	}
}

if (require.main === module) {
	new Migration(validateAndReturnParams()).execute().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}

module.exports = { Migration };
