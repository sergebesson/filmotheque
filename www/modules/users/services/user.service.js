import { callApiBackend } from "../../../common/call-api-backend.js";

const apiUrl = "api/users";

/**
 * Données du détail utilisateur et opérations HTTP, sans dépendance à la validation.
 * GET/POST/PATCH renvoient le schéma user_detail complet ; seuls les payloads
 * explicitement énumérés ci-dessous sont envoyés, jamais l'instance entière.
 * Les opérations HTTP rejettent sans afficher : leur appelant possède l'erreur.
 * load/createUser/saveUser/deleteUser résolvent la même instance (Promise<User>) ;
 * getByName résout une nouvelle instance chargée. Les réponses remplacent les champs,
 * dont le pseudo éventuellement normalisé par le serveur après envoi d'une chaîne vide.
 * isDeleted reste local, activé après DELETE réussi ; isAdmin lit is_admin reçu du serveur.
 */
class User {
	static async getByName(name) {
		const user = new User();
		return await user.load(name);
	}

	/** Promise<boolean> : HEAD 204 → true, 404 → false ; tout autre échec rejette. */
	static async userExists(name) {
		const { status } = await callApiBackend({
			method: "head", url: `${ apiUrl }/${ encodeURIComponent(name) }`,
			validateStatus: (statusToValidate) =>
				statusToValidate === 204 || statusToValidate === 404,
		});
		return status === 204;
	}

	constructor() {
		this.name = "";
		this.active = true;
		this.password = "";
		this.pseudo = "";
		this.description = "";
		this.sexe = "";
		this.isDeleted = false;
	}

	async load(name) {
		const { data: user } = await callApiBackend({
			method: "get", url: `${ apiUrl }/${ encodeURIComponent(name) }`,
		});
		Object.assign(this, user);
		return this;
	}

	get isAdmin() {
		return this.is_admin;
	}

	async saveUser() {
		const { data: user } = await callApiBackend({
			method: "patch", url: `${ apiUrl }/${ encodeURIComponent(this.name) }`,
			data: {
				active: this.active,
				password: this.password,
				pseudo: this.pseudo,
				description: this.description,
				sexe: this.sexe,
			},
		});
		Object.assign(this, user);
		return this;
	}
	async createUser() {
		const { data: user } = await callApiBackend({
			method: "post", url: apiUrl,
			data: {
				name: this.name,
				active: this.active,
				password: this.password,
				pseudo: this.pseudo,
				description: this.description,
				sexe: this.sexe,
			},
		});
		Object.assign(this, user);
		return this;
	}

	async deleteUser() {
		await callApiBackend({ method: "delete", url: `${ apiUrl }/${ encodeURIComponent(this.name) }` });
		this.isDeleted = true;
		return this;
	}
}

export { User };
