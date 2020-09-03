#!/usr/bin/env node
"use strict";

/* eslint-disable no-console */

// eslint-disable-next-line node/no-unsupported-features/node-builtins
const fs = require("fs").promises;
const yargs = require("yargs");

const { LoadConfiguration } = require("../server/services/load-configuration.js");
const { UsersStore } = require("../server/stores/users.store");

function validateAndReturnParams() {
	return yargs
		.locale("fr")
		.usage("usage : $0 [options]")
		.option("config", {
			describe: "ficher de configuration",
			alias: "c",
			type: "string",
			requiresArg: true,
			demandOption: true,
		})
		.option("file", {
			describe: "ficher users à importer",
			alias: "f",
			type: "string",
			requiresArg: true,
			demandOption: true,
		})
		.wrap(100)
		.help()
		.argv;
}

class Migration {
	static async forEachPromise(array, promise) {
		return await recursiveLoopPromise(array.entries());

		async function recursiveLoopPromise(iterator, resultPromise = []) {
			const { value, done } = iterator.next();
			if (done) {
				return resultPromise;
			}

			resultPromise.push(await promise(value[1]));
			return await recursiveLoopPromise(iterator, resultPromise);
		}
	}
	constructor({ file, config }) {
		this.file = file;
		this.loadConfiguration = new LoadConfiguration(config);
	}
	async execute() {
		console.log("Migration des utilisateurs");
		console.log();
		process.stdout.write("Chargement de la configuration");
		const configLoader = await this.loadConfiguration.load();
		process.stdout.write(" => OK\n");

		process.stdout.write(`Lecture du fichier '${ this.file }'`);
		const users = JSON.parse(await fs.readFile(this.file, "utf8"));
		process.stdout.write(" => OK\n");

		process.stdout.write("Initialisation du users store");
		const usersStore = new UsersStore({ configLoader });
		await usersStore.initialize();
		process.stdout.write(" => OK\n");

		await Migration.forEachPromise(Object.entries(users),
			async([ name, infos ]) => {
				process.stdout.write(`migration de '${ name }'`);
				const userInfos = {
					name,
					password: infos.passwd,
					description: infos.description,
					sexe: infos.sexe,
				};
				try {
					await usersStore.insert(userInfos);
				} catch (error) {
					if (error.message !== "alreadyExists") {
						throw error;
					}
					await usersStore.update(userInfos);
				}
				process.stdout.write(" => OK\n");
			},
		);
		console.log();
		console.log("Migration des utilisateurs terminée");
	}
}

async function execute() {
	const parameters = validateAndReturnParams();
	try {
		const migration = new Migration(parameters);
		await migration.execute();
	} catch (error) {
		console.error(error);
	}
}

execute();
