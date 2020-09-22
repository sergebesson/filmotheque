"use strict";

const _ = require("lodash");
const path = require("path");
const { safeCompare } = require("express-basic-auth");

const { JsonDb } = require("@sbesson/json-db");

const { User } = require("./user");

class UsersStore {
	constructor({ configLoader }) {
		const directory = configLoader.getValue("storage.databaseDirectory");
		this.structureJsonDb = {
			idName: "name",
			jsonSchema: {
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
			},
			searchIndex: [ "name", "pseudo", "description" ],
		};

		this.jsonDb = new JsonDb(path.join(directory, "users"));

		this._loginUser = null;
		this._usersExpressBasicAuth = null;
	}

	async initialize() {
		try {
			await this.jsonDb.loadCollection();
		} catch (error) {
			if (error.code !== "ENOENT") {
				throw error;
			}
			await this.jsonDb.create(this.structureJsonDb);
			await this.jsonDb.insert({
				name: "serge",
				password: "achanger",
				pseudo: "Yod",
				description: "moi",
				sexe: "M",
				avatar_id: "man-06",
				avatar_format: "svg",
			});
		}
	}

	set loginUser(name) {
		const user = this.jsonDb.collection.getById(name);
		if (!user) {
			throw new Error(`loginUser - utilisateur ${ name } inconnu`);
		}
		this._loginUser = new User(user);
	}
	get loginUser() {
		return this._loginUser;
	}

	checkAuthentification({ name: nameInput, password: passwordInput }) {
		return _.some(
			this.jsonDb.collection.find({ active: true }),
			({ name, password }) =>
				// eslint-disable-next-line no-bitwise
				safeCompare(nameInput, name) & safeCompare(passwordInput, password),
		);
	}

	search({ query, search }) {
		return this.jsonDb.collection.search({ query, search })
			.map((user) => new User(user).json);
	}

	getUserByName({ name }) {
		const user = this.jsonDb.collection.getById(name);
		if (!user) {
			return null;
		}
		return new User(user);
	}

	async insert(userInfos) {
		const { document: user } = await this.jsonDb.insert(new User(userInfos).jsonAll);
		return new User(user);
	}

	async update(userUpdateInfos) {
		const userInfos = this.jsonDb.collection.getById(userUpdateInfos.name);
		if (!userInfos) {
			throw new Error("userNotfound");
		}
		const user = new User({ ...userInfos, ..._.omitBy(userUpdateInfos, _.isUndefined) });
		const { document: userUpdate } = await this.jsonDb.update(user.jsonAll);
		return new User(userUpdate);
	}

	async delete({ name }) {
		const userInfos = this.jsonDb.collection.getById(name);
		if (!userInfos) {
			throw new Error("userNotfound");
		}
		const user = new User(userInfos);
		if (user.isAdmin) {
			throw new Error("unauthorized");
		}
		await this.jsonDb.delete(name);
	}
}

module.exports = { UsersStore };
