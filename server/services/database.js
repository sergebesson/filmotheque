"use strict";
/* eslint-disable no-sync */

const fs = require("node:fs/promises");
const path = require("node:path");
const { open } = require("lmdb");

class Database {
	static async open({ configLoader }) {
		const directory = configLoader.getValue("storage.databaseDirectory");
		const destination = path.join(directory, "filmotheque-lmdb");
		await fs.mkdir(destination, { recursive: true, mode: 0o770 });
		const root = open({ path: destination, noSubdir: false, overlappingSync: false });
		try {
			const database = new Database(root);
			root.transactionSync(() => {
				database.users = root.openDB({ name: "users", encoding: "json" });
				database.usersByLogin = root.openDB({ name: "usersByLogin", encoding: "string" });
				database.movies = root.openDB({ name: "movies", encoding: "json" });
			});
			return database;
		} catch (error) {
			await root.close();
			throw error;
		}
	}

	constructor(root) {
		this.root = root;
		this.pending = new Set();
		this.closing = null;
	}

	run(operation) {
		if (this.closing) {
			return Promise.reject(new Error("Database is closing"));
		}
		const operationPromise = Promise.resolve().then(operation);
		this.pending.add(operationPromise);
		return operationPromise.finally(() => this.pending.delete(operationPromise));
	}

	async flush() {
		try {
			await this.root.flushed;
		} catch (cause) {
			throw new Error("Durabilité non confirmée après commit LMDB", { cause });
		}
	}

	close() {
		if (!this.closing) {
			this.closing = (async() => {
				await Promise.allSettled(this.pending);
				try {
					await this.flush();
				} finally {
					await this.root.close();
				}
			})();
		}
		return this.closing;
	}
}

module.exports = { Database };
