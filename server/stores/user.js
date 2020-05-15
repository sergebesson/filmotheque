"use strict";

const _ = require("lodash");
const path = require("path");
const decamelizeKeys = require("decamelize-keys");

class User {
	constructor({
		name, password, pseudo = null, active = true, description, sexe,
		avatar_id: avatarId, avatar_format: avatarFormat = "svg",
	}) {
		this.name = name;
		this.password = password;
		this.pseudo = pseudo || name;
		this.active = active || this.name === "serge";
		this.description = description;
		this.sexe = sexe;
		this.avatarId = avatarId;
		this.avatarFormat = avatarFormat;
		this._isAdmin = this.name === "serge";

		if (!this.avatarId) {
			const idNumber = _.random(1, 30).toString().padStart(2, "0");
			this.avatarId = `${ this.sexe === "F" ? "woman" : "man" }-${ idNumber }`;
		}
	}

	get isAdmin() {
		return this._isAdmin;
	}

	get avatarFile() {
		return path.join(__dirname, `avatars/avatar-${ this.avatarId }.${ this.avatarFormat }`);
	}

	get jsonPublic() {
		return {
			name: this.name,
			pseudo: this.pseudo,
			sexe: this.sexe,
			is_admin: this.isAdmin,
		};
	}

	get json() {
		return {
			name: this.name,
			password: this.password,
			pseudo: this.pseudo,
			active: this.active,
			description: this.description,
			sexe: this.sexe,
			is_admin: this.isAdmin,
		};
	}

	get jsonAll() {
		return decamelizeKeys(_.omitBy(this, (value, key) => key.startsWith("_")));
	}
}

module.exports = { User };
