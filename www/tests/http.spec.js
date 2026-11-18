import { test, expect } from "@playwright/test";
import { callApiBackend } from "../common/call-api-backend.js";
import { User } from "../modules/users/services/user.service.js";

let originalFetch;
let originalDocument;
test.beforeEach(() => {
	originalFetch = globalThis.fetch;
	originalDocument = globalThis.document;
	globalThis.document = { baseURI: "http://filmotheque.test/" };
});
test.afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalDocument === undefined) { delete globalThis.document; }
	else { globalThis.document = originalDocument; }
});

test("HTTP : corps JSON, réponses vides et statuts HEAD personnalisés", async () => {
	const payload = { pseudo: "Été & mer", active: false };
	globalThis.fetch = async (url, options) => {
		expect(url.href).toBe("http://filmotheque.test/api/users?search=%C3%A9t%C3%A9+%2B+%26");
		expect(options.method).toBe("PATCH");
		expect(options.headers).toEqual({ Accept: "application/json", "Content-Type": "application/json" });
		expect(options.body).toBe(JSON.stringify(payload));
		return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json; charset=utf-8" } });
	};
	await expect(callApiBackend({ url: "api/users", method: "patch", params: { search: "été + &" }, data: payload }))
		.resolves.toEqual({ status: 200, data: payload });
	for (const status of [204, 404]) {
		globalThis.fetch = async (url, options) => {
			expect(url.pathname).toBe("/api/users/alice");
			expect(options).toEqual({ method: "HEAD", headers: { Accept: "application/json" }, body: undefined });
			return new Response(null, { status });
		};
		await expect(User.userExists("alice")).resolves.toBe(status === 204);
		await expect(callApiBackend({ url: "api/users/alice", method: "head", validateStatus: code => code === 204 || code === 404 }))
			.resolves.toEqual({ status, data: "" });
	}
	globalThis.fetch = async (url, options) => {
		expect(url.pathname).toBe("/api/users/alice");
		expect(options).toEqual({ method: "DELETE", headers: { Accept: "application/json" }, body: undefined });
		return new Response(null, { status: 204 });
	};
	const user = new User();
	user.name = "alice";
	await expect(user.deleteUser()).resolves.toBe(user);
	expect(user.isDeleted).toBe(true);
});

for (const [name, segment] of [
	["alice", "alice"],
	["Élodie Dupont", "%C3%89lodie%20Dupont"],
	["nom#suffixe", "nom%23suffixe"],
	["nom?option=1", "nom%3Foption%3D1"],
	["nom%23suffixe", "nom%2523suffixe"],
	["nom%", "nom%25"],
]) {
	test(`User : segment de chemin exact pour ${name}`, async () => {
		const data = {
			name, active: true, password: "abcd", pseudo: name,
			description: "Compte COR-02", sexe: "F", is_admin: false,
		};
		for (const status of [204, 404]) {
			globalThis.fetch = async (url) => {
				expect(url.href).toBe(`http://filmotheque.test/api/users/${segment}`);
				return new Response(null, { status });
			};
			await expect(User.userExists(name)).resolves.toBe(status === 204);
		}
		globalThis.fetch = async (url, options) => {
			expect(url.href).toBe(`http://filmotheque.test/api/users/${segment}`);
			return options.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(data);
		};
		const user = await User.getByName(name);
		expect(user.name).toBe(name);
		await expect(user.saveUser()).resolves.toBe(user);
		expect(user.name).toBe(name);
		await expect(user.deleteUser()).resolves.toBe(user);
		expect(user.isDeleted).toBe(true);
	});
}

test("User : payloads POST/PATCH distincts et données des réponses conservées", async () => {
	const user = new User();
	user.name = "nouvelle";
	user.active = false;
	user.password = "abcd";
	user.pseudo = "";
	user.description = "Création";
	user.sexe = "F";
	const created = {
		name: "nouvelle", active: false, password: "abcd", pseudo: "nouvelle",
		description: "Création", sexe: "F", is_admin: false,
	};
	globalThis.fetch = async (url, options) => {
		expect(url.pathname).toBe("/api/users");
		expect(options.method).toBe("POST");
		expect(JSON.parse(options.body)).toEqual({
			name: "nouvelle", active: false, password: "abcd", pseudo: "",
			description: "Création", sexe: "F",
		});
		return Response.json(created, { status: 201 });
	};
	await expect(user.createUser()).resolves.toBe(user);
	expect(user.pseudo).toBe("nouvelle");
	expect(user.isAdmin).toBe(false);
	expect(user.isDeleted).toBe(false);

	const loaded = {
		name: "serge", active: true, password: "chargé", pseudo: "Administrateur",
		description: "Chargement", sexe: "M", is_admin: true,
	};
	globalThis.fetch = async (url, options) => {
		expect(url.pathname).toBe("/api/users/serge");
		expect(options.method).toBe("GET");
		return Response.json(loaded);
	};
	const admin = await User.getByName("serge");
	for (const field of ["name", "active", "password", "pseudo", "description", "sexe"]) {
		expect(admin[field]).toBe(loaded[field]);
	}
	expect(admin.isAdmin).toBe(true);
	admin.active = false;
	admin.password = "modifié";
	admin.pseudo = "Modification";
	admin.description = "Nouvelle description";
	admin.sexe = "F";
	globalThis.fetch = async (url, options) => {
		expect(url.pathname).toBe("/api/users/serge");
		expect(options.method).toBe("PATCH");
		expect(JSON.parse(options.body)).toEqual({
			active: false, password: "modifié", pseudo: "Modification",
			description: "Nouvelle description", sexe: "F",
		});
		return Response.json(loaded);
	};
	await expect(admin.saveUser()).resolves.toBe(admin);
	for (const field of ["name", "active", "password", "pseudo", "description", "sexe"]) {
		expect(admin[field]).toBe(loaded[field]);
	}
	expect(admin.isAdmin).toBe(true);
});

test("HTTP : erreurs JSON, HTML, JSON invalide et réseau propagées", async () => {
	for (const [body, contentType, status, data] of [
		['{"error_description":"Refus"}', "application/json", 403, { error_description: "Refus" }],
		["<h1>Indisponible</h1>", "text/html", 503, "<h1>Indisponible</h1>"],
	]) {
		globalThis.fetch = async () => new Response(body, { status, headers: { "content-type": contentType } });
		await expect(callApiBackend({ url: "api/users" })).rejects.toMatchObject({
			message: `Request failed with status code ${status}`, response: { status, data },
		});
	}
	globalThis.fetch = async () => new Response("{", { headers: { "content-type": "application/json" } });
	await expect(callApiBackend({ url: "api/users" })).rejects.toBeInstanceOf(SyntaxError);
	const failure = new TypeError("Failed to fetch");
	globalThis.fetch = async () => { throw failure; };
	await expect(callApiBackend({ url: "api/users" })).rejects.toBe(failure);
});
