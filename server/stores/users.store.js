"use strict";
/* eslint-disable no-sync */

const _ = require("lodash");
const { createHash, randomUUID } = require("node:crypto");
const { safeCompare } = require("express-basic-auth");
const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const { searchDocuments } = require("../services/search");
const { User } = require("./user");

class UsersStore {
	constructor({ database }) {
		this.database = database;
		const ajv = new Ajv({ allErrors: true });
		ajvFormats(ajv);
		this.validate = ajv.compile({
			type: "object",
			properties: {
				name: { type: "string" },
				password: { type: "string", minLength: 4 },
				pseudo: { type: "string" },
				active: { type: "boolean", default: true },
				description: { type: "string" },
				sexe: { type: "string", enum: [ "F", "M" ] },
				avatar_id: { type: "string" },
				avatar_format: { type: "string" },
			},
			additionalProperties: false,
			required: [ "name", "password", "pseudo", "sexe", "avatar_id", "avatar_format" ],
		});
	}

	static get initialUser() {
		return {
			name: "serge",
			password: "achanger",
			pseudo: "Yod",
			description: "moi",
			sexe: "M",
			avatar_id: "man-06",
			avatar_format: "svg",
			active: true,
		};
	}

	async initialize() {
		if (this.database.users.getCount() === 0) {
			await this.insert(UsersStore.initialUser);
		}
	}

	authenticate({ name, password }) {
		const { uuid, user } = this.resolve(name);
		if (!user?.active || !safeCompare(name, user.name) ||
			!safeCompare(password, user.password)) {
			return null;
		}
		return uuid;
	}

	checkAuthentification(credentials) {
		return this.authenticate(credentials) !== null;
	}

	search({ query, search }) {
		const documents = Array.from(this.database.users.getRange(), ({ value }) => value);
		return searchDocuments(documents, [ "name", "pseudo", "description" ], { query, search })
			.map((user) => new User(user).json);
	}

	getUserByName({ name }) {
		const { user } = this.resolve(name);
		return user ? new User(user) : null;
	}

	getUserByUuid({ uuid }) {
		const user = this.database.users.get(uuid);
		return user ? new User(user) : null;
	}

	resolve(name) {
		const hash = createHash("sha256").update(name, "utf8").digest("hex");
		const uuid = this.database.usersByLogin.get(hash);
		if (uuid === undefined) {
			return { hash };
		}
		const user = this.database.users.get(uuid);
		if (!user) {
			throw new Error("loginIndexInconsistent");
		}
		if (user.name !== name) {
			throw new Error("loginHashCollision");
		}
		return { hash, uuid, user };
	}

	validateUser(user) {
		if (!this.validate(user)) {
			const error = new Error("invalidDocument");
			error.reasons = this.validate.errors.map((reason) => _.omit(reason, "schemaPath"));
			throw error;
		}
	}

	async rebuildLoginIndex() {
		return this.database.run(async() => {
			const count = this.database.root.transactionSync(() => {
				this.database.usersByLogin.clearSync();
				let indexed = 0;
				for (const { key: uuid, value: user } of this.database.users.getRange()) {
					this.validateUser(user);
					const hash = createHash("sha256").update(user.name, "utf8").digest("hex");
					const existing = this.database.usersByLogin.get(hash);
					if (existing !== undefined) {
						throw new Error(this.database.users.get(existing).name === user.name ?
							"alreadyExists" : "loginHashCollision");
					}
					this.database.usersByLogin.putSync(hash, uuid);
					indexed++;
				}
				return indexed;
			});
			await this.database.flush();
			return { number_indexed_users: count };
		});
	}

	async insert(userInfos) {
		return this.database.run(async() => {
			const user = new User(userInfos);
			const profile = user.jsonAll;
			this.validateUser(profile);
			this.database.root.transactionSync(() => {
				const { hash, uuid } = this.resolve(user.name);
				if (uuid !== undefined) {
					throw new Error("alreadyExists");
				}
				const userId = randomUUID();
				if (this.database.users.get(userId) !== undefined) {
					throw new Error("alreadyExists");
				}
				this.database.users.putSync(userId, profile);
				this.database.usersByLogin.putSync(hash, userId);
			});
			await this.database.flush();
			return user;
		});
	}

	async update(userUpdateInfos) {
		return this.database.run(async() => {
			const updated = this.database.root.transactionSync(() => {
				const { uuid, user } = this.resolve(userUpdateInfos.name);
				if (!user) {
					throw new Error("userNotfound");
				}
				const result = new User({ ...user, ..._.omitBy(userUpdateInfos, _.isUndefined) });
				const profile = result.jsonAll;
				this.validateUser(profile);
				this.database.users.putSync(uuid, profile);
				return result;
			});
			await this.database.flush();
			return updated;
		});
	}

	async delete({ name }) {
		return this.database.run(async() => {
			this.database.root.transactionSync(() => {
				const { hash, uuid, user } = this.resolve(name);
				if (!user) {
					throw new Error("userNotfound");
				}
				if (new User(user).isAdmin) {
					throw new Error("unauthorized");
				}
				this.database.users.removeSync(uuid);
				this.database.usersByLogin.removeSync(hash);
			});
			await this.database.flush();
		});
	}
}

module.exports = { UsersStore };
