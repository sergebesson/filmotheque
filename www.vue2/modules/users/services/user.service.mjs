/* global axios, validators */

import { eventBus, eventName } from "../../../eventBus.mjs";
import { oneOf } from "../../../common/vuelidate-validator.mjs";

class User {
	static get configuration() {
		return {
			apiUrl: "api/users",
		};
	}

	static validations(createMode) {
		const validationsSchema = {
			name: { required: validators.required },
			active: {},
			password: { required: validators.required, minLength: validators.minLength(4) },
			pseudo: {},
			description: { required: validators.required },
			sexe: { required: validators.required, oneOf: oneOf([ "F", "M" ]) },
		};

		if (createMode) {
			validationsSchema.name.notUserExists = async(name) => {
				if (name === "") {
					return true;
				}
				return !await User.userExists(name);
			};
		}
		return validationsSchema;
	}

	static async getByName(name) {
		const user = new User();
		return await user.load(name);
	}

	static async userExists(name) {
		try {
			const { status } = await axios({
				method: "head", url: `${ User.configuration.apiUrl }/${ name }`,
				validateStatus: (statusToValidate) =>
					statusToValidate === 204 || statusToValidate === 404,
			});
			return status === 204;
		} catch (error) {
			eventBus.$emit(eventName.ERROR, `Impossible de savoir si l'utilisateur '${ name }' existe`, error);
			throw error;
		}
	}

	constructor() {
		this.user = {
			name: "",
			active: true,
			password: "",
			pseudo: "",
			description: "",
			sexe: "",
		};
		this._isDeleted = false;
	}

	async load(name) {
		try {
			const { data: user } = await axios({
				method: "get", url: `${ User.configuration.apiUrl }/${ name }`,
			});
			this.user = user;
			return this;
		} catch (error) {
			eventBus.$emit(eventName.ERROR, `Impossible de récupérer l'utilisateur ${ name }`, error);
			throw error;
		}
	}

	get name() {
		return this.user.name;
	}
	set name(name) {
		this.user.name = name;
	}
	get active() {
		return this.user.active;
	}
	set active(active) {
		this.user.active = active;
	}
	get password() {
		return this.user.password;
	}
	set password(password) {
		this.user.password = password;
	}
	get pseudo() {
		return this.user.pseudo;
	}
	set pseudo(pseudo) {
		this.user.pseudo = pseudo;
	}
	get description() {
		return this.user.description;
	}
	set description(description) {
		this.user.description = description;
	}
	get sexe() {
		return this.user.sexe;
	}
	set sexe(sexe) {
		this.user.sexe = sexe;
	}
	get isAdmin() {
		return this.user.is_admin;
	}
	get isDeleted() {
		return this._isDeleted;
	}

	toJson() {
		return this.user;
	}

	async saveUser() {
		try {
			const { data: user } = await axios({
				method: "patch", url: `${ User.configuration.apiUrl }/${ this.name }`,
				data: {
					active: this.active,
					password: this.password,
					pseudo: this.pseudo,
					description: this.description,
					sexe: this.sexe,
				},
			});
			this.user = user;
			return this;
		} catch (error) {
			eventBus.$emit(eventName.ERROR, `Impossible de sauver l'utilisateur ${ this.name }`, error);
			throw error;
		}
	}
	async createUser() {
		try {
			const { data: user } = await axios({
				method: "post", url: `${ User.configuration.apiUrl }`,
				data: {
					name: this.name,
					active: this.active,
					password: this.password,
					pseudo: this.pseudo,
					description: this.description,
					sexe: this.sexe,
				},
			});
			this.user = user;
			return this;
		} catch (error) {
			eventBus.$emit(eventName.ERROR, `Impossible de créer l'utilisateur ${ this.name }`, error);
			throw error;
		}
	}

	async deleteUser() {
		try {
			await axios({ method: "delete", url: `${ User.configuration.apiUrl }/${ this.name }` });
			this._isDeleted = true;
			return this;
		} catch (error) {
			eventBus.$emit(eventName.ERROR, `Impossible de supprimer l'utilisateur ${ this.name }`, error);
			throw error;
		}
	}
}

export { User };
