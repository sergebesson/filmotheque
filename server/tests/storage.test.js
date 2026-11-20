"use strict";
/* eslint-disable no-sync */
/* eslint max-lines: ["warn", { "max": 1100 }] -- Garde le parcours de reprise avec ses fixtures HTTP. */

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { COPYFILE_EXCL } = require("node:fs").constants;
const { tmpdir } = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { request: httpRequest } = require("node:http");
const { spawn, execFile } = require("node:child_process");
const { once } = require("node:events");
const { promisify } = require("node:util");
const { open } = require("lmdb");
const { Database } = require("../services/database");
const { MoviesStore } = require("../stores/movies.store");
const { UsersStore } = require("../stores/users.store");
const { InfosStore } = require("../stores/infos.store");
const { Server } = require("../server");
const { Migration } = require("../../scripts/migration_users");

const runFile = promisify(execFile);
const migrationScript = path.join(__dirname, "../../scripts/migration_users.js");
const rebuildIndexScript = path.join(__dirname, "../../scripts/rebuild_users_login_index.js");

const environment = {};
before(() => {
	for (const key of [ "PORT", "HOST", "URL_SERVER", "SSL_ENABLE", "MOVIES_DIR", "DB_DIR", "LOGS_FILE", "LOGS_LEVEL" ]) {
		environment[key] = process.env[key];
		delete process.env[key];
	}
});
after(() => {
	for (const [ key, value ] of Object.entries(environment)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

const hash = (name) => createHash("sha256").update(name, "utf8").digest("hex");
const profile = (name) => ({ name, password: "test-password", sexe: "F", description: "Été + mer" });

async function fixture(testContext) {
	const directory = await fs.mkdtemp(path.join(tmpdir(), "filmotheque-storage-"));
	const context = {
		directory,
		configLoader: { getValue: () => directory },
		logger: { log: () => undefined },
	};
	testContext.after(async() => {
		await context.database?.close();
		await fs.rm(directory, { recursive: true, force: true });
	});
	context.database = await Database.open(context);
	context.usersStore = new UsersStore(context);
	context.moviesStore = new MoviesStore(context);
	return context;
}

async function reopen(context) {
	await context.database.close();
	context.database = await Database.open(context);
	context.usersStore = new UsersStore(context);
	context.moviesStore = new MoviesStore(context);
}

async function configuration(context) {
	const file = path.join(context.directory, "configuration.json");
	await fs.writeFile(file, JSON.stringify({
		storage: { databaseDirectory: context.directory, moviesDirectory: path.join(context.directory, "films") },
		server: { host: "localhost", port: 4173, url_server: "localhost", ssl: { enable: false }, closeTimeoutInMin: 0.001 },
		logs: { file: path.join(context.directory, "server.log"), level: "error" },
	}));
	return file;
}

async function movieFile(directory, name, content = "Un film de test") {
	await fs.mkdir(directory, { recursive: true });
	await fs.writeFile(path.join(directory, name), content);
	await fs.utimes(path.join(directory, name), new Date("2024-02-29T23:15:00Z"), new Date("2024-02-29T23:15:00Z"));
}

test("comptes : reprendre un bootstrap échoué sans réinitialiser un compte existant", async(testContext) => {
	const context = await fixture(testContext);
	const put = context.database.usersByLogin.putSync.bind(context.database.usersByLogin);
	const failure = testContext.mock.method(context.database.usersByLogin, "putSync", (...args) => {
		put(...args);
		throw new Error("bootstrap-write-failed");
	});
	await assert.rejects(context.usersStore.initialize(), /bootstrap-write-failed/);
	failure.mock.restore();
	assert.equal(context.database.users.getCount(), 0);
	assert.equal(context.database.usersByLogin.getCount(), 0);
	await reopen(context);
	await context.usersStore.initialize();
	assert.equal(context.database.users.getCount(), 1);
	assert.equal(context.database.usersByLogin.getCount(), 1);
	assert.equal(context.usersStore.getUserByName({ name: "serge" }).isAdmin, true);
	const uuid = context.database.usersByLogin.get(hash("serge"));
	await context.usersStore.update({ name: "serge", password: "kept-password", pseudo: "Compte conservé" });
	await reopen(context);
	await context.usersStore.initialize();
	assert.equal(context.database.users.getCount(), 1);
	assert.equal(context.database.usersByLogin.get(hash("serge")), uuid);
	assert.equal(context.usersStore.getUserByName({ name: "serge" }).pseudo, "Compte conservé");
	assert.equal(context.usersStore.checkAuthentification({ name: "serge", password: "kept-password" }), true);
});

test("comptes : unicité atomique, UUID stable, logins exacts et validation", async(testContext) => {
	const context = await fixture(testContext);
	const { usersStore: users, database } = context;
	const outcomes = await Promise.allSettled([ users.insert(profile("élise")), users.insert(profile("élise")) ]);
	assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
	assert.equal(outcomes.find((result) => result.status === "rejected").reason.message, "alreadyExists");
	assert.equal(database.users.getCount(), 1);
	assert.equal(database.usersByLogin.getCount(), 1);
	const uuid = database.usersByLogin.get(hash("élise"));
	assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	const original = users.getUserByName({ name: "élise" });
	const updated = await users.update({ name: "élise", pseudo: "Modifiée", password: "new-password", description: undefined });
	assert.equal(updated.avatarId, original.avatarId);
	assert.equal(updated.description, "Été + mer");
	assert.equal(updated.json.uuid, undefined);
	assert.equal(users.checkAuthentification({ name: "élise", password: "test-password" }), false);
	assert.equal(users.checkAuthentification({ name: "élise", password: "new-password" }), true);
	await users.update({ name: "élise", active: false });
	assert.equal(users.checkAuthentification({ name: "élise", password: "new-password" }), false);
	await users.update({ name: "élise", active: true });
	await assert.rejects(users.insert({ ...profile("invalid"), password: "123", sexe: "X" }), (error) => {
		assert.equal(error.message, "invalidDocument");
		assert.equal(error.reasons.length, 2);
		assert.equal(error.reasons[0].schemaPath, undefined);
		return true;
	});
	const longName = "漢é🙂".repeat(1200);
	assert.ok(Buffer.byteLength(longName) > database.users.maxKeySize);
	for (const name of [ longName, "ÉLISE", "e\u0301lise", " élise " ]) {
		await users.insert(profile(name));
	}
	assert.equal(users.getUserByName({ name: "elise" }), null);
	assert.equal(users.search({ search: "ete mer", query: { active: true } }).length, 5);
	await reopen(context);
	assert.equal(context.database.usersByLogin.get(hash("élise")), uuid);
	assert.equal(context.usersStore.getUserByName({ name: "élise" }).pseudo, "Modifiée");
	assert.equal(context.usersStore.getUserByName({ name: longName }).name, longName);
	await context.usersStore.delete({ name: longName });
	assert.equal(context.database.usersByLogin.get(hash(longName)), undefined);
	assert.equal(context.usersStore.getUserByName({ name: longName }), null);
	await context.usersStore.insert(profile("serge"));
	await assert.rejects(context.usersStore.delete({ name: "serge" }), /unauthorized/);
	assert.equal((await context.usersStore.update({ name: "serge", active: false })).active, true);
	await assert.rejects(context.usersStore.update({ name: "inconnu" }), /userNotfound/);
	await assert.rejects(context.usersStore.delete({ name: "inconnu" }), /userNotfound/);
});

test("comptes : rollback entre bases et collision sans accès au tiers", async(testContext) => {
	const context = await fixture(testContext);
	const { database, usersStore: users } = context;
	const createFailure = testContext.mock.method(database.usersByLogin, "putSync", () => {
		throw new Error("write-failed");
	});
	await assert.rejects(users.insert(profile("alice")), /write-failed/);
	createFailure.mock.restore();
	assert.equal(database.users.getCount(), 0);
	assert.equal(database.usersByLogin.getCount(), 0);
	await users.insert(profile("alice"));
	const uuid = database.usersByLogin.get(hash("alice"));
	const deleteFailure = testContext.mock.method(database.usersByLogin, "removeSync", () => {
		throw new Error("delete-failed");
	});
	await assert.rejects(users.delete({ name: "alice" }), /delete-failed/);
	deleteFailure.mock.restore();
	await reopen(context);
	assert.equal(context.database.usersByLogin.get(hash("alice")), uuid);
	assert.equal(context.usersStore.getUserByName({ name: "alice" }).name, "alice");
	context.database.root.transactionSync(() => context.database.usersByLogin.putSync(hash("autre"), uuid));
	assert.throws(() => context.usersStore.getUserByName({ name: "autre" }), /loginHashCollision/);
	assert.throws(() => context.usersStore.checkAuthentification({ name: "autre", password: "test-password" }), /loginHashCollision/);
	await assert.rejects(context.usersStore.insert(profile("autre")), /loginHashCollision/);
	await assert.rejects(context.usersStore.update({ name: "autre", pseudo: "Intrus" }), /loginHashCollision/);
	await assert.rejects(context.usersStore.delete({ name: "autre" }), /loginHashCollision/);
	assert.equal(context.usersStore.getUserByName({ name: "alice" }).pseudo, "alice");
	context.database.root.transactionSync(() => context.database.users.removeSync(uuid));
	assert.throws(() => context.usersStore.getUserByName({ name: "alice" }), /loginIndexInconsistent/);
});

test("index comptes : reconstruire sans modifier les comptes, persister et annuler un échec", async(testContext) => {
	const context = await fixture(testContext);
	const { database, usersStore } = context;
	const names = [ "élise", "ÉLISE", "e\u0301lise", " 漢🙂 ".repeat(300) ];
	for (const name of names) {
		await usersStore.insert(profile(name));
	}
	await usersStore.update({ name: names[1], active: false });
	const accounts = Array.from(database.users.getRange());
	const expected = Array.from(database.usersByLogin.getRange());
	const otherUuid = usersStore.resolve(names[0]).uuid;
	database.root.transactionSync(() => {
		database.usersByLogin.removeSync(hash(names[0]));
		database.usersByLogin.putSync(hash(names[1]), otherUuid);
		database.usersByLogin.putSync(hash("orphelin"), "uuid-absent");
	});
	const broken = Array.from(database.usersByLogin.getRange());
	const put = database.usersByLogin.putSync.bind(database.usersByLogin);
	let writes = 0;
	const failure = testContext.mock.method(database.usersByLogin, "putSync", (...args) => {
		put(...args);
		if (++writes === 2) {
			throw new Error("rebuild-write-failed");
		}
	});
	await assert.rejects(usersStore.rebuildLoginIndex(), /rebuild-write-failed/);
	failure.mock.restore();
	await reopen(context);
	assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), broken);
	assert.deepEqual(Array.from(context.database.users.getRange()), accounts);
	assert.deepEqual(await context.usersStore.rebuildLoginIndex(), { number_indexed_users: 4 });
	await reopen(context);
	assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), expected);
	assert.deepEqual(Array.from(context.database.users.getRange()), accounts);
	for (const name of names) {
		assert.equal(context.usersStore.getUserByName({ name }).name, name);
		assert.equal(context.usersStore.checkAuthentification({ name, password: "test-password" }), name !== names[1]);
	}
	assert.equal(context.usersStore.getUserByName({ name: "orphelin" }), null);
	assert.deepEqual(await context.usersStore.rebuildLoginIndex(), { number_indexed_users: 4 });
});

test("index comptes : refuser comptes invalides, doublons et collisions sans perdre l’index", async(testContext) => {
	const context = await fixture(testContext);
	await context.usersStore.insert(profile("alice"));
	await context.usersStore.insert(profile("bob"));
	const accounts = Array.from(context.database.users.getRange());
	const index = Array.from(context.database.usersByLogin.getRange());
	const [ first, second ] = accounts;
	for (const [ firstUser, secondUser, error ] of [
		[ first.value, { ...second.value, name: 12 }, /invalidDocument/ ],
		[ first.value, { ...second.value, name: first.value.name }, /alreadyExists/ ],
		[ { ...first.value, name: "nom-\ud800" }, { ...second.value, name: "nom-\ud801" }, /loginHashCollision/ ],
	]) {
		context.database.root.transactionSync(() => {
			context.database.users.putSync(first.key, firstUser);
			context.database.users.putSync(second.key, secondUser);
		});
		const invalid = Array.from(context.database.users.getRange());
		await assert.rejects(context.usersStore.rebuildLoginIndex(), error);
		await reopen(context);
		assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), index);
		assert.deepEqual(Array.from(context.database.users.getRange()), invalid);
	}
	await context.database.close();
	const config = await configuration(context);
	await assert.rejects(runFile(process.execPath, [ rebuildIndexScript, "--config", config ]), (error) => {
		assert.equal(error.code, 1);
		assert.match(error.stderr, /loginHashCollision/);
		assert.equal(error.stdout, "");
		return true;
	});
	await reopen(context);
	assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), index);
});

test("index comptes CLI et HTTP 4173 : réparer l’accès admin, contrôler les droits et confirmer le succès", async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	await context.usersStore.insert(profile("serge"));
	await context.usersStore.insert(profile("lectrice"));
	const accounts = Array.from(context.database.users.getRange());
	const expected = Array.from(context.database.usersByLogin.getRange());
	const movie = { _id: "42", themoviedb_id: "42", title: "Film intact" };
	context.database.root.transactionSync(() => {
		context.database.movies.putSync("42", movie);
		context.database.usersByLogin.removeSync(hash("serge"));
	});
	const json = path.join(context.directory, "users.documents.json");
	await fs.writeFile(json, "JSON sentinelle à ne pas lire");
	await context.database.close();
	const endpoint = "http://localhost:4173/api/users/index/rebuild";
	const request = (name, method = "POST") => fetch(endpoint, {
		method,
		headers: name ? { Authorization: `Basic ${Buffer.from(`${name}:test-password`).toString("base64")}` } : {},
	});
	const blocked = await Server.createServerAndStart(config);
	testContext.after(() => blocked.close());
	assert.equal((await request("serge")).status, 401);
	await blocked.close();
	const { stdout } = await runFile(process.execPath, [ rebuildIndexScript, "--config", config ]);
	assert.match(stdout, /Index des logins reconstruit : 2 comptes/);
	const server = await Server.createServerAndStart(config);
	testContext.after(() => server.close());
	const { database, usersStore } = server.context;
	assert.deepEqual(Array.from(database.usersByLogin.getRange()), expected);
	assert.equal((await request()).status, 401);
	assert.equal((await request("lectrice")).status, 401);
	assert.equal((await request("serge", "GET")).status, 405);
	assert.deepEqual(Array.from(database.usersByLogin.getRange()), expected);
	database.root.transactionSync(() => {
		database.usersByLogin.putSync(hash("lectrice"), usersStore.resolve("serge").uuid);
		database.usersByLogin.putSync(hash("orphelin"), "absent");
	});
	const repaired = await request("serge");
	assert.equal(repaired.status, 200);
	assert.deepEqual(await repaired.json(), { number_indexed_users: 2 });
	assert.deepEqual(Array.from(database.usersByLogin.getRange()), expected);
	assert.equal((await request("lectrice")).status, 401);
	assert.equal(usersStore.checkAuthentification({ name: "lectrice", password: "test-password" }), true);
	const failure = testContext.mock.method(database, "flush", async() => {
		throw new Error("Durabilité non confirmée après commit LMDB");
	});
	const unconfirmed = await request("serge");
	assert.equal(unconfirmed.status, 500);
	assert.deepEqual(await unconfirmed.json(), { status: 500, error_description: "Internal Server Error" });
	failure.mock.restore();
	await server.close();
	await reopen(context);
	assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), expected);
	assert.deepEqual(Array.from(context.database.users.getRange()), accounts);
	assert.deepEqual(context.moviesStore.get({ id: "42" }), movie);
	assert.equal(await fs.readFile(json, "utf8"), "JSON sentinelle à ne pas lire");
});

test("HTTP 4173 : identité et droits restent propres à chaque requête entrelacée", { timeout: 10000 }, async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	await context.usersStore.insert(profile("serge"));
	await context.usersStore.insert(profile("lectrice"));
	await context.database.close();
	const server = await Server.createServerAndStart(config);
	const requests = [];
	testContext.after(async() => {
		for (const request of requests) {
			request.destroy();
		}
		await server.close();
	});
	const { database } = server.context;
	const authorization = (name) => `Basic ${Buffer.from(`${name}:test-password`).toString("base64")}`;
	for (const [ route, caller, other, expectedStatus, accountChange ] of [
		[ "me", "lectrice", "serge", 200 ], [ "me", "serge", "lectrice", 200 ],
		[ "me", "lectrice", "serge", 401, "delete" ],
		[ "index/rebuild", "lectrice", "serge", 401 ],
		[ "index/rebuild", "serge", "lectrice", 200 ],
		[ "index/rebuild", "lectrice", "serge", 401, "delete" ],
		[ "me", "lectrice", "serge", 401, "replace" ],
	]) {
		const meRequest = route === "me";
		database.root.transactionSync(() => database.usersByLogin.putSync(hash("orphelin"), "absent"));
		const received = once(server.server, "request");
		const pending = httpRequest(`http://localhost:4173/api/users/${route}`, {
			method: meRequest ? "GET" : "POST",
			headers: { Authorization: authorization(caller), "Content-Type": "application/json", "Content-Length": 2 },
		});
		requests.push(pending);
		const completed = new Promise((resolve, reject) => {
			pending.on("response", (response) => {
				let body = "";
				response.setEncoding("utf8");
				response.on("data", (chunk) => {
					body += chunk;
				});
				response.on("end", () => resolve({ status: response.statusCode, body }));
			});
			pending.on("error", reject);
		});
		pending.write("{");
		await received;
		const interleaved = await fetch("http://localhost:4173/api/users/me", {
			headers: { Authorization: authorization(other) },
		});
		assert.equal(interleaved.status, 200);
		assert.equal((await interleaved.json()).name, other);
		if (accountChange) {
			const removed = await fetch(`http://localhost:4173/api/users/${caller}`, {
				method: "DELETE", headers: { Authorization: authorization(other) },
			});
			assert.equal(removed.status, 204);
		}
		const replacementPseudo = "Nouvelle lectrice";
		if (accountChange === "replace") {
			const created = await fetch("http://localhost:4173/api/users", {
				method: "POST",
				headers: { Authorization: authorization(other), "Content-Type": "application/json" },
				body: JSON.stringify({ ...profile(caller), pseudo: replacementPseudo }),
			});
			assert.equal(created.status, 201);
			await created.json();
			const fresh = await fetch("http://localhost:4173/api/users/me", {
				headers: { Authorization: authorization(caller) },
			});
			assert.equal(fresh.status, 200);
			assert.deepEqual(await fresh.json(), {
				name: caller, pseudo: replacementPseudo, sexe: "F", is_admin: false,
			});
		}
		const beforeIndex = Array.from(database.usersByLogin.getRange());
		const accounts = Array.from(database.users.getRange());
		pending.end("}");
		const response = await completed;
		assert.equal(response.status, expectedStatus);
		if (expectedStatus === 401) {
			assert.deepEqual(JSON.parse(response.body), { status: 401, error_description: "Unauthorized" });
		} else if (meRequest) {
			assert.deepEqual(JSON.parse(response.body), {
				name: caller, pseudo: caller, sexe: "F", is_admin: caller === "serge",
			});
		} else {
			assert.deepEqual(JSON.parse(response.body), { number_indexed_users: 2 });
		}
		if (expectedStatus === 401 || meRequest) {
			assert.deepEqual(Array.from(database.usersByLogin.getRange()), beforeIndex);
		} else {
			assert.equal(database.usersByLogin.get(hash("orphelin")), undefined);
			assert.equal(database.usersByLogin.getCount(), 2);
		}
		assert.deepEqual(Array.from(database.users.getRange()), accounts);
		if (accountChange === "delete") {
			await server.context.usersStore.insert(profile(caller));
		}
	}
});

test("index comptes CLI : une base vide reste vide, sans bootstrap", async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	context.database.root.transactionSync(() => context.database.usersByLogin.putSync(hash("orphelin"), "absent"));
	await context.database.close();
	const { stdout } = await runFile(process.execPath, [ rebuildIndexScript, "--config", config ]);
	assert.match(stdout, /Index des logins reconstruit : 0 comptes/);
	await reopen(context);
	assert.equal(context.database.users.getCount(), 0);
	assert.equal(context.database.usersByLogin.getCount(), 0);
	assert.equal(context.moviesStore.count(), 0);
});

test("films : remplacement manuel, fragments ordonnés et refus non destructifs", async(testContext) => {
	const context = await fixture(testContext);
	const directory = path.join(context.directory, "films");
	const names = [ "Retour vers le futur (1985) Sci @105#42$tt0088763.avi",
		"Batman (1989) Animation #144687# $tt0096895$ @268@.mkv", "Été A+B (2020) Drame @999.mp4" ];
	for (const name of names) {
		await movieFile(directory, name);
	}
	await context.moviesStore.initialize();
	assert.equal(context.moviesStore.count(), 0);
	assert.deepEqual(context.moviesStore.search({}), []);
	const json = path.join(context.directory, "filmotheque.documents.json");
	await fs.writeFile(json, "JSON illisible sentinelle");
	await reopen(context);
	assert.equal(context.moviesStore.count(), 0);
	const pending = context.moviesStore.importMovies({ directory });
	await assert.rejects(context.moviesStore.importMovies({ directory }), /importInProgress/);
	assert.equal((await pending).success, true);
	const byId = (left, right) => left._id.localeCompare(right._id);
	const expected = context.moviesStore.search({}).sort(byId);
	assert.equal(expected.length, 3);
	const movie = context.moviesStore.get({ id: "105" });
	assert.equal(movie._id, movie.themoviedb_id);
	assert.equal(movie.date_added, "2024-02-29");
	assert.equal(movie.allocine_id, "42");
	assert.equal(movie.imdb_id, "tt0088763");
	assert.equal(movie.size, Buffer.byteLength("Un film de test"));
	assert.equal(context.moviesStore.get({ id: "268" }).themoviedb_id, "268");
	assert.equal(context.moviesStore.get({ id: "268" }).file_name, names[1]);
	assert.equal(context.moviesStore.get({ id: "ancien-id" }), undefined);
	for (const [ search, ids ] of [
		[ "", [ "105", "268", "999" ] ], [ "  ", [ "105", "268", "999" ] ],
		[ "retour\t futur", [ "105" ] ], [ "futur retour", [] ], [ "man", [ "268" ] ],
		[ "batman animation", [ "268" ] ], [ "animation batman", [] ],
		[ "ETE", [ "999" ] ], [ "A+B", [ "999" ] ], [ "A.B", [] ], [ 12, [ "105", "268", "999" ] ],
	]) {
		const matches = context.moviesStore.search({ search }).map((item) => item._id).sort();
		assert.deepEqual(matches, ids);
	}
	assert.equal(context.moviesStore.search({ search: "bat", query: [ "categories", "Drame" ] }).length, 0);
	assert.equal(context.moviesStore.search({ query: (item) => item.size > 0 }).length, 3);
	assert.equal((await new InfosStore(context).get()).number_of_movies, 3);
	for (const name of names) {
		await fs.unlink(path.join(directory, name));
	}
	const refusal = await context.moviesStore.importMovies({ directory });
	assert.equal(refusal.success, false);
	assert.equal(refusal.refusal_reason, "Aucun film valide trouvé ; catalogue conservé");
	await movieFile(directory, "Sans TMDB (2020) Sci #42.avi");
	await movieFile(directory, "TMDB invalide (2020) Sci @123abc@.avi");
	assert.equal((await context.moviesStore.importMovies({ directory })).bad_files.length, 2);
	await assert.rejects(context.moviesStore.importMovies({ directory: path.join(directory, "absent") }), { code: "ENOENT" });
	await reopen(context);
	assert.deepEqual(context.moviesStore.search({}).sort(byId), expected);
	assert.equal(await fs.readFile(json, "utf8"), "JSON illisible sentinelle");
	const first = "A premier (2020) Sci @200.avi";
	const second = "Z doublon (2020) Sci @200@.avi";
	await movieFile(directory, second);
	await movieFile(directory, first);
	const originalStat = fs.stat;
	let release;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const delayed = testContext.mock.method(fs, "stat", async(file, ...args) => {
		if (path.basename(file) === first) {
			await gate;
		}
		if (path.basename(file) === second) {
			release();
		}
		return originalStat(file, ...args);
	});
	const mixed = await context.moviesStore.importMovies({ directory });
	delayed.mock.restore();
	assert.equal(mixed.number_inserted_movies, 1);
	assert.equal(mixed.number_error_movies, 3);
	const duplicate = mixed.bad_files.find((error) => error.file_name === second);
	assert.ok(duplicate.error.includes(first) && duplicate.error.includes(second) && duplicate.error.includes("200"));
	assert.equal(context.moviesStore.get({ id: "200" }).file_name, first);
	assert.equal(context.moviesStore.count(), 1);
	await fs.access(path.join(directory, second));
});

test("films : un échec après vidage et écriture annule le remplacement entier", async(testContext) => {
	const context = await fixture(testContext);
	const directory = path.join(context.directory, "films");
	await movieFile(directory, "Ancien (2020) Sci @100.avi");
	await context.moviesStore.importMovies({ directory });
	const previous = context.moviesStore.get({ id: "100" });
	await fs.unlink(path.join(directory, previous.file_name));
	await movieFile(directory, "Nouveau (2020) Sci @200.avi");
	const put = context.database.movies.putSync.bind(context.database.movies);
	const failure = testContext.mock.method(context.database.movies, "putSync", (...args) => {
		put(...args);
		throw new Error("import-write-failed");
	});
	await assert.rejects(context.moviesStore.importMovies({ directory }), /import-write-failed/);
	failure.mock.restore();
	await reopen(context);
	assert.equal(context.moviesStore.count(), 1);
	assert.deepEqual(context.moviesStore.get({ id: "100" }), previous);
	assert.equal(context.moviesStore.get({ id: "200" }), undefined);
});

test("fermeture : attendre un import encore en lecture, refuser les nouvelles mutations", async(testContext) => {
	const context = await fixture(testContext);
	const directory = path.join(context.directory, "films");
	await movieFile(directory, "Film (2020) Sci @555.avi");
	let release, entered;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const started = new Promise((resolve) => {
		entered = resolve;
	});
	const readdir = fs.readdir;
	const delayed = testContext.mock.method(fs, "readdir", async(file, ...args) => {
		if (file === directory) {
			entered(); await gate;
		}
		return readdir(file, ...args);
	});
	const importing = context.moviesStore.importMovies({ directory });
	await started;
	const closing = context.database.close();
	assert.equal(context.database.close(), closing);
	await assert.rejects(context.usersStore.insert(profile("trop-tard")), /Database is closing/);
	release();
	await importing;
	await closing;
	delayed.mock.restore();
	await reopen(context);
	assert.equal(context.moviesStore.get({ id: "555" }).title, "Film");
	assert.equal(context.usersStore.getUserByName({ name: "trop-tard" }), null);
});

test("confirmation disque : une erreur après commit ne prétend pas annuler le compte", async(testContext) => {
	const context = await fixture(testContext);
	Object.defineProperty(context.database.root, "flushed", { configurable: true, get: () => Promise.reject(new Error("disk-sync-failed")) });
	await assert.rejects(context.usersStore.insert(profile("visible")), /Durabilité non confirmée après commit/);
	delete context.database.root.flushed;
	assert.equal(context.usersStore.getUserByName({ name: "visible" }).name, "visible");
	await reopen(context);
	assert.equal(context.usersStore.getUserByName({ name: "visible" }).name, "visible");
});

test("comptes : initialiser toute base vide sans consulter les anciens JSON", async(testContext) => {
	const context = await fixture(testContext);
	await context.database.close();
	await fs.rm(path.join(context.directory, "filmotheque-lmdb"), { recursive: true });
	const source = path.join(context.directory, "users.documents.json");
	await fs.writeFile(source, "JSON sentinelle non lisible");
	await fs.writeFile(path.join(context.directory, "users.structure.json"), "Structure illisible");
	await reopen(context);
	await context.usersStore.initialize();
	assert.equal(context.database.users.getCount(), 1);
	assert.equal(context.usersStore.getUserByName({ name: "serge" }).isAdmin, true);
	assert.equal(context.moviesStore.count(), 0);
	context.database.root.transactionSync(() => {
		context.database.users.clearSync();
		context.database.usersByLogin.clearSync();
	});
	await reopen(context);
	await context.usersStore.initialize();
	assert.equal(context.database.users.getCount(), 1);
	assert.equal(context.database.usersByLogin.getCount(), 1);
	assert.equal(context.usersStore.getUserByName({ name: "serge" }).isAdmin, true);
	assert.equal(await fs.readFile(source, "utf8"), "JSON sentinelle non lisible");
	assert.equal(await fs.readFile(path.join(context.directory, "users.structure.json"), "utf8"), "Structure illisible");
});

test("migration CLI : profils exacts, authentification HTTP et refus de relance sans toucher aux JSON", async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	const file = path.join(context.directory, "users.documents.json");
	const structure = path.join(context.directory, "users.structure.json");
	const longName = " éLiSe漢🙂#%/? ".repeat(90);
	const documents = Object.fromEntries([ "serge", "Élodie Dupont", longName ].map((name, index) => [ name, {
		...profile(name), password: `source-password-${index}`, pseudo: `Profil ${index}`,
		active: index !== 1, avatar_id: "woman-12", avatar_format: "svg",
		__private__: { search: "cache technique à ignorer" },
	} ]));
	const source = JSON.stringify(documents, null, 2);
	await fs.writeFile(file, source);
	await fs.writeFile(structure, "Structure source conservée, non utilisée");
	const movie = { _id: "42", themoviedb_id: "42", title: "Film déjà conservé" };
	context.database.root.transactionSync(() => context.database.movies.putSync("42", movie));
	await context.database.close();
	const { stdout } = await runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]);
	assert.match(stdout, /Migration vérifiée : 3 comptes/);
	await reopen(context);
	const accounts = Array.from(context.database.users.getRange());
	assert.equal(accounts.length, 3);
	assert.equal(context.database.usersByLogin.getCount(), 3);
	assert.equal(new Set(accounts.map(({ key }) => key)).size, 3);
	for (const [ name, original ] of Object.entries(documents)) {
		const document = { ...original };
		delete document.__private__;
		const uuid = context.database.usersByLogin.get(hash(name));
		assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		assert.deepEqual(context.database.users.get(uuid), document);
		assert.equal(context.usersStore.checkAuthentification({
			name, password: document.password,
		}), document.active);
		assert.equal(context.usersStore.getUserByName({ name }).avatarId, "woman-12");
	}
	await context.usersStore.initialize();
	assert.deepEqual(Array.from(context.database.users.getRange()), accounts);
	assert.deepEqual(context.moviesStore.get({ id: "42" }), movie);
	await context.database.close();
	const server = await Server.createServerAndStart(config);
	testContext.after(() => server.close());
	for (const [ index, name ] of Object.keys(documents).entries()) {
		const response = await fetch("http://localhost:4173/api/users/me", {
			headers: { Authorization: `Basic ${Buffer.from(`${name}:source-password-${index}`).toString("base64")}` },
		});
		assert.equal(response.status, documents[name].active ? 200 : 401);
		if (response.ok) {
			assert.equal((await response.json()).name, name);
		}
	}
	await server.close();
	await assert.rejects(runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]), (error) => {
		assert.equal(error.code, 1);
		assert.match(error.stderr, /base de comptes n’est pas vide/);
		return true;
	});
	await reopen(context);
	assert.deepEqual(Array.from(context.database.users.getRange()), accounts);
	assert.deepEqual(context.moviesStore.get({ id: "42" }), movie);
	assert.equal(await fs.readFile(file, "utf8"), source);
	assert.equal(await fs.readFile(structure, "utf8"), "Structure source conservée, non utilisée");
});

test("migration CLI : remplacer uniquement le compte initial inchangé après démarrage", async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	const file = path.join(context.directory, "users.documents.json");
	const document = {
		...profile("serge"), password: "migrated-password", pseudo: "Compte historique", active: true,
		avatar_id: "woman-12", avatar_format: "svg",
	};
	const source = JSON.stringify({ serge: document });
	await fs.writeFile(file, source);
	await context.database.close();
	const server = await Server.createServerAndStart(config);
	testContext.after(() => server.close());
	const initial = server.context.usersStore.resolve("serge");
	const movie = { _id: "42", themoviedb_id: "42", title: "Film conservé" };
	server.context.database.root.transactionSync(() => server.context.database.movies.putSync("42", movie));
	await server.close();
	const { stdout } = await runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]);
	assert.match(stdout, /Migration vérifiée : 1 comptes/);
	await reopen(context);
	const migrated = context.usersStore.resolve("serge");
	assert.notEqual(migrated.uuid, initial.uuid);
	assert.equal(context.database.users.get(initial.uuid), undefined);
	assert.deepEqual(migrated.user, document);
	assert.equal(context.database.users.getCount(), 1);
	assert.equal(context.database.usersByLogin.getCount(), 1);
	assert.equal(context.usersStore.checkAuthentification({ name: "serge", password: document.password }), true);
	assert.equal(context.usersStore.checkAuthentification({ name: "serge", password: initial.user.password }), false);
	await context.usersStore.initialize();
	assert.equal(context.usersStore.resolve("serge").uuid, migrated.uuid);
	assert.deepEqual(context.moviesStore.get({ id: "42" }), movie);
	await context.database.close();
	await assert.rejects(runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]), (error) => error.code === 1);
	await reopen(context);
	assert.deepEqual(context.usersStore.resolve("serge"), migrated);
	assert.equal(await fs.readFile(file, "utf8"), source);
});

test("migration CLI : refuser sources invalides et comptes préexistants", async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	const file = path.join(context.directory, "users.documents.json");
	const document = { ...profile("source"), pseudo: "Source", active: false, avatar_id: "woman-12", avatar_format: "svg" };
	const valid = JSON.stringify({ source: document });
	await context.database.close();
	for (const source of [ "{", "null", "[]", "{}", JSON.stringify({ autre: document }),
		JSON.stringify({ source: { ...document, password: "123" } }) ]) {
		await fs.writeFile(file, source);
		await assert.rejects(runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]), (error) => error.code === 1);
		await reopen(context);
		assert.equal(context.database.users.getCount(), 0);
		assert.equal(context.database.usersByLogin.getCount(), 0);
		assert.equal(await fs.readFile(file, "utf8"), source);
		await context.database.close();
	}
	await fs.writeFile(file, valid);
	await reopen(context);
	await context.usersStore.initialize();
	const initial = context.usersStore.resolve("serge");
	await fs.writeFile(file, JSON.stringify({ source: { ...document, password: "123" } }));
	await context.database.close();
	await assert.rejects(runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]), (error) => error.code === 1);
	await reopen(context);
	assert.deepEqual(context.usersStore.resolve("serge"), initial);
	await fs.writeFile(file, valid);
	const withoutDescription = { ...initial.user };
	delete withoutDescription.description;
	for (const changed of [
		{ ...initial.user, password: "changed-password" }, { ...initial.user, pseudo: "Autre pseudo" },
		{ ...initial.user, description: "Autre description" }, { ...initial.user, sexe: "F" },
		{ ...initial.user, avatar_id: "woman-12" }, { ...initial.user, avatar_format: "png" },
		{ ...initial.user, active: false }, { ...initial.user, unexpected: true },
		withoutDescription,
	]) {
		context.database.root.transactionSync(() =>
			context.database.users.putSync(initial.uuid, changed));
		const accounts = Array.from(context.database.users.getRange());
		const index = Array.from(context.database.usersByLogin.getRange());
		await context.database.close();
		await assert.rejects(runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]), (error) => error.code === 1);
		await reopen(context);
		assert.deepEqual(Array.from(context.database.users.getRange()), accounts);
		assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), index);
	}
	context.database.root.transactionSync(() =>
		context.database.users.putSync(initial.uuid, initial.user));
	await context.usersStore.insert(profile("autre"));
	const multiple = Array.from(context.database.users.getRange());
	await context.database.close();
	await assert.rejects(runFile(process.execPath, [ migrationScript, "--config", config, "--file", file ]), (error) => {
		assert.equal(error.code, 1);
		assert.match(error.stderr, /n’est pas vide/);
		return true;
	});
	await reopen(context);
	assert.deepEqual(Array.from(context.database.users.getRange()), multiple);
	const index = Array.from(context.database.usersByLogin.getRange());
	await context.database.close();
	await assert.rejects(runFile(process.execPath, [ migrationScript, "--config", config, "--file", file, "--supprimer-json" ]), (error) => {
		assert.equal(error.code, 1);
		assert.match(error.stderr, /supprimer-json/);
		return true;
	});
	await reopen(context);
	assert.deepEqual(Array.from(context.database.users.getRange()), multiple);
	assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), index);
	assert.equal(await fs.readFile(file, "utf8"), valid);
});

test("migration : rollback global et erreur de durabilité après commit distincte", async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	const file = path.join(context.directory, "users.documents.json");
	const documents = Object.fromEntries([ "première", "seconde" ].map((name) => [ name, {
		...profile(name), pseudo: name, active: true, avatar_id: "woman-12", avatar_format: "svg",
	} ]));
	const source = JSON.stringify(documents);
	await fs.writeFile(file, source);
	for (const withInitialUser of [ false, true ]) {
		if (withInitialUser) {
			await context.usersStore.initialize();
		}
		const accounts = Array.from(context.database.users.getRange());
		const index = Array.from(context.database.usersByLogin.getRange());
		const opening = testContext.mock.method(Database, "open", async() => context.database);
		const put = context.database.usersByLogin.putSync.bind(context.database.usersByLogin);
		const failure = testContext.mock.method(context.database.usersByLogin, "putSync", (...args) => {
			put(...args);
			if (args[0] === hash("seconde")) {
				throw new Error("migration-write-failed");
			}
		});
		const close = context.database.close.bind(context.database);
		const closing = withInitialUser && testContext.mock.method(context.database, "close", async() => {
			await close();
			throw new Error("migration-close-failed");
		});
		await assert.rejects(new Migration({ config, file }).execute(), withInitialUser ?
			/migration-write-failed.*fermeture.*migration-close-failed/ : /migration-write-failed/);
		if (closing) {
			closing.mock.restore();
		}
		failure.mock.restore(); opening.mock.restore();
		await reopen(context);
		assert.deepEqual(Array.from(context.database.users.getRange()), accounts);
		assert.deepEqual(Array.from(context.database.usersByLogin.getRange()), index);
	}
	const reopenMock = testContext.mock.method(Database, "open", async() => context.database);
	const flush = context.database.flush.bind(context.database);
	let confirmations = 0;
	const syncFailure = testContext.mock.method(context.database, "flush", async() => {
		if (confirmations++ === 0) {
			throw new Error("Durabilité non confirmée après commit LMDB");
		}
		await flush();
	});
	await assert.rejects(new Migration({ config, file }).execute(),
		/Durabilité non confirmée après commit/);
	syncFailure.mock.restore(); reopenMock.mock.restore();
	await reopen(context);
	assert.equal(context.database.users.getCount(), 2);
	assert.equal(context.database.usersByLogin.getCount(), 2);
	for (const [ name, document ] of Object.entries(documents)) {
		const uuid = context.database.usersByLogin.get(hash(name));
		assert.deepEqual(context.database.users.get(uuid), document);
	}
	assert.equal(await fs.readFile(file, "utf8"), source);
});

test("HTTP 4173 : migration, catalogue vide, import manuel, arrêt et restauration LMDB", async(testContext) => {
	const context = await fixture(testContext);
	const maxKeySize = context.database.users.maxKeySize;
	const config = await configuration(context);
	await context.database.close();
	const source = path.join(context.directory, "users.documents.json");
	const documents = JSON.stringify({ serge: {
		...profile("serge"), pseudo: "Admin migré", active: true, avatar_id: "man-06", avatar_format: "svg",
	} });
	await fs.writeFile(source, documents);
	await runFile(process.execPath, [ migrationScript, "--config", config, "--file", source ]);
	await fs.writeFile(path.join(context.directory, "filmotheque.documents.json"), "catalogue JSON à ignorer");
	const directory = path.join(context.directory, "films");
	for (let index = 1; index <= 14; index++) {
		await movieFile(directory, `Film ${String(15 - index).padStart(2, "0")} (2020) Sci @${index}.avi`);
	}
	await fs.utimes(path.join(directory, "Film 14 (2020) Sci @1.avi"),
		new Date("2025-01-01T23:30:00Z"), new Date("2025-01-01T23:30:00Z"));
	await movieFile(directory, "Sans identifiant (2020) Sci #22.avi");
	await movieFile(directory, "Z Doublon (2020) Sci @1.avi", "Fichier écarté");
	// eslint-disable-next-line id-length -- TZ est le nom standard de la variable d’environnement.
	const childEnvironment = { ...process.env, TZ: "Europe/Paris" };
	const child = spawn(process.execPath, [ path.join(__dirname, "../../index.js"), config ], {
		stdio: [ "ignore", "pipe", "pipe" ], env: childEnvironment,
	});
	let output = "";
	child.stdout.on("data", (chunk) => {
		output += chunk;
	});
	child.stderr.on("data", (chunk) => {
		output += chunk;
	});
	testContext.after(async() => {
		if (child.exitCode === null && child.signalCode === null) {
			child.kill("SIGTERM"); await once(child, "exit");
		}
	});
	async function waitForStarted(count) {
		for (let attempt = 0; attempt < 100; attempt++) {
			if ((output.match(/Server started/g) || []).length >= count) {
				return;
			}
			assert.equal(child.exitCode, null, output);
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
		assert.fail(`Démarrage absent : ${output}`);
	}
	const request = (url, options = {}, name = "serge", password = "test-password") => fetch(`http://localhost:4173${url}`, {
		...options, headers: { Authorization: `Basic ${Buffer.from(`${name}:${password}`).toString("base64")}`,
			"Content-Type": "application/json" },
	});
	await waitForStarted(1);
	assert.equal((await (await request("/api/infos")).json()).number_of_movies, 0);
	assert.deepEqual((await (await request("/api/movies?page_size=1")).json()).movies, []);
	assert.equal((await (await request("/api/users/me")).json()).pseudo, "Admin migré");
	const imported = await request("/api/movies/initialize", { method: "POST" });
	assert.equal(imported.status, 200);
	const report = await imported.json();
	assert.equal(report.number_inserted_movies, 14);
	assert.equal(report.success, false);
	assert.equal(report.number_error_movies, 2);
	assert.deepEqual(report.movies_in_error, []);
	assert.deepEqual(report.bad_files.map((entry) => entry.file_name), [
		"Sans identifiant (2020) Sci #22.avi", "Z Doublon (2020) Sci @1.avi",
	]);
	assert.match(report.bad_files[1].error, /retenu « Film 14 \(2020\) Sci @1\.avi »/);
	assert.equal((await (await request("/api/infos")).json()).number_of_movies, 14);
	const page = await (await request("/api/movies?page=2&page_size=3&search=film")).json();
	assert.equal(page.total_movies, 14);
	assert.equal(page.total_pages, 5);
	assert.deepEqual(page.movies.map((movie) => movie.title), [ "Film 04", "Film 05", "Film 06" ]);
	const all = await (await request("/api/movies?page_size=14&sort=date-added")).json();
	assert.equal(all.movies.length, 14);
	assert.deepEqual(all.movies.slice(0, 3).map((movie) => movie._id), [ "1", "14", "13" ]);
	assert.equal(all.movies[0].date_added, "2025-01-01");
	const download = await request(`/api/movies/${all.movies[0]._id}/download`);
	assert.equal(download.status, 200);
	assert.equal(await download.text(), "Un film de test");
	assert.equal(download.headers.get("content-disposition"),
		"attachment; filename=\"Film 14 (2020) Sci @1.avi\"");
	assert.equal((await request("/api/movies/ancien-id/download")).ok, false);
	const user = { ...profile("lectrice"), pseudo: "Lectrice" };
	assert.equal((await request("/api/users", { method: "POST", body: JSON.stringify(user) })).status, 201);
	assert.equal((await request("/api/users/me", {}, user.name)).status, 200);
	assert.equal((await request("/api/movies/initialize", { method: "POST" }, user.name)).ok, false);
	assert.equal((await request(`/api/users/${user.name}`, { method: "PATCH", body: JSON.stringify({ password: "changed-password", active: false }) })).status, 200);
	assert.equal((await request("/api/users/me", {}, user.name)).status, 401);
	assert.equal((await request("/api/users/me", {}, user.name, "changed-password")).status, 401);
	assert.equal((await request(`/api/users/${user.name}`, { method: "PATCH", body: JSON.stringify({ active: true }) })).status, 200);
	assert.equal((await request("/api/users/me", {}, user.name, "changed-password")).status, 200);
	assert.equal((await request(`/api/users/${user.name}`, { method: "DELETE" })).status, 204);
	assert.equal((await request("/api/users/me", {}, user.name, "changed-password")).status, 401);
	const longName = "é".repeat(1100);
	assert.ok(Buffer.byteLength(longName) > maxKeySize);
	const longUser = { ...profile(longName), pseudo: "Login Unicode long" };
	assert.equal((await request("/api/users", { method: "POST", body: JSON.stringify(longUser) })).status, 201);
	const longPath = `/api/users/${encodeURIComponent(longName)}`;
	assert.equal((await (await request(longPath)).json()).name, longName);
	assert.equal((await (await request("/api/users/me", {}, longName)).json()).name, longName);
	assert.equal((await request(longPath, { method: "DELETE" })).status, 204);
	assert.equal((await request("/api/users/me", {}, longName)).status, 401);
	const renamed = "Film renommé (2020) Sci @1.avi";
	await fs.rename(path.join(directory, "Film 14 (2020) Sci @1.avi"), path.join(directory, renamed));
	await fs.utimes(path.join(directory, renamed), new Date("2025-02-03T23:30:00Z"), new Date("2025-02-03T23:30:00Z"));
	assert.equal((await (await request("/api/movies/initialize", { method: "POST" })).json()).number_inserted_movies, 14);
	const replacement = (await (await request("/api/movies?search=film%20renomme")).json()).movies;
	assert.deepEqual(replacement.map((movie) => [ movie._id, movie.date_added ]), [ [ "1", "2025-02-03" ] ]);
	const renamedDownload = await request("/api/movies/1/download");
	assert.equal(await renamedDownload.text(), "Un film de test");
	assert.equal(renamedDownload.headers.get("content-disposition"), `attachment; filename="${renamed}"`);
	const held = path.join(context.directory, "films-conserves");
	await fs.rename(directory, held);
	await fs.mkdir(directory);
	const refused = await request("/api/movies/initialize", { method: "POST" });
	assert.equal(refused.status, 200);
	assert.match((await refused.json()).refusal_reason, /catalogue conservé/);
	await fs.rmdir(directory);
	await fs.rename(held, directory);
	child.kill("SIGUSR1");
	await waitForStarted(2);
	assert.equal((await (await request("/api/infos")).json()).number_of_movies, 14);
	const exited = once(child, "exit");
	child.kill("SIGTERM");
	assert.deepEqual(await exited, [ 0, null ]);
	await reopen(context);
	assert.equal(context.moviesStore.count(), 14);
	assert.equal(context.usersStore.getUserByName({ name: "serge" }).isAdmin, true);
	assert.equal(await fs.readFile(source, "utf8"), documents);

	const snapshot = (environmentRoot) => Object.fromEntries([
		[ "users", "json" ], [ "usersByLogin", "string" ], [ "movies", "json" ],
	].map(([ name, encoding ]) => {
		const store = environmentRoot.openDB({ name, encoding, create: false });
		assert.ok(store, `Base LMDB absente : ${name}`);
		return [ name, Array.from(store.getRange()) ];
	}));
	const expected = snapshot(context.database.root);
	await context.database.close();
	const backup = await fs.mkdtemp(path.join(context.directory, "backup-"));
	const root = open({ path: path.join(context.directory, "filmotheque-lmdb"), noSubdir: false, readOnly: true });
	try {
		await root.backup(backup, false);
	} finally {
		await root.close();
	}
	assert.deepEqual(await fs.readdir(backup), [ "data.mdb" ]);
	const backupFile = path.join(backup, "data.mdb");
	const checksum = async(file) => createHash("sha256").update(await fs.readFile(file)).digest("hex");
	const expectedChecksum = await checksum(backupFile);
	await reopen(context);
	await context.usersStore.update({ name: "serge", pseudo: "Après sauvegarde" });
	await context.usersStore.insert(profile("nouveau"));
	assert.equal(context.usersStore.getUserByName({ name: "nouveau" }).name, "nouveau");
	const changed = snapshot(context.database.root);
	assert.notDeepEqual(changed, expected);
	await context.database.close();

	async function restore(file, parent) {
		assert.equal(await checksum(file), expectedChecksum, "Intégrité du cliché");
		const destination = path.join(parent, "filmotheque-lmdb");
		await fs.mkdir(destination, { mode: 0o700 });
		await fs.copyFile(file, path.join(destination, "data.mdb"), COPYFILE_EXCL);
		return destination;
	}
	const parent = await fs.mkdtemp(path.join(context.directory, "restore-"));
	await assert.rejects(restore(backupFile, context.directory), { code: "EEXIST" });
	const invalid = path.join(backup, "incomplet.mdb");
	await fs.writeFile(invalid, "Copie incomplète");
	await assert.rejects(restore(invalid, parent), /Intégrité du cliché/);
	assert.deepEqual(await fs.readdir(parent), []);
	const destination = await restore(backupFile, parent);
	const copy = open({ path: destination, noSubdir: false, readOnly: true });
	try {
		assert.deepEqual(snapshot(copy), expected);
	} finally {
		await copy.close();
	}
	const restoredConfig = JSON.parse(await fs.readFile(config, "utf8"));
	restoredConfig.storage.databaseDirectory = parent;
	const restoredFile = path.join(parent, "configuration.json");
	await fs.writeFile(restoredFile, JSON.stringify(restoredConfig));
	const restored = await Server.createServerAndStart(restoredFile);
	try {
		assert.equal((await (await request("/api/users/me")).json()).pseudo, "Admin migré");
		assert.equal((await request("/api/users/me", {}, "nouveau")).status, 401);
		assert.equal((await (await request("/api/infos")).json()).number_of_movies, 14);
		assert.deepEqual((await (await request("/api/movies?search=film%20renomme")).json()).movies, replacement);
		assert.equal(await (await request("/api/movies/1/download")).text(), "Un film de test");
	} finally {
		await restored.close();
	}
	assert.equal(await checksum(backupFile), expectedChecksum);
	await reopen(context);
	assert.deepEqual(snapshot(context.database.root), changed);
});

test("échec d’initialisation : fermeture après les autres stores ; échec d’écoute", async(testContext) => {
	const context = await fixture(testContext);
	const config = await configuration(context);
	await context.database.close();
	let release, entered;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const started = new Promise((resolve) => {
		entered = resolve;
	});
	const failure = testContext.mock.method(UsersStore.prototype, "initialize", async() => {
		throw new Error("init-failed");
	});
	const delayed = testContext.mock.method(MoviesStore.prototype, "initialize", async function () {
		entered(); await gate;
		// eslint-disable-next-line no-invalid-this
		return this.count();
	});
	const initialized = Server.initializeContext({ configurationFile: config });
	const rejected = assert.rejects(initialized, /init-failed/);
	await started;
	release();
	await rejected;
	failure.mock.restore(); delayed.mock.restore();
	await reopen(context);
	await context.usersStore.insert(profile("serge"));
	await context.database.close();
	await movieFile(path.join(context.directory, "films"), "Disponible (2020) Sci @222.avi");
	const server = await Server.createServerAndStart(config);
	testContext.after(() => server.close());
	await assert.rejects(Server.createServerAndStart(config), { code: "EADDRINUSE" });
	assert.equal(server.context.moviesStore.count(), 0);
	await server.close();
	const settings = JSON.parse(await fs.readFile(config, "utf8"));
	settings.server.ssl = { enable: true, keyFile: path.join(context.directory, "absent.key"), certFile: "absent.crt" };
	const tlsConfig = path.join(context.directory, "tls-configuration.json");
	await fs.writeFile(tlsConfig, JSON.stringify(settings));
	await assert.rejects(Server.createServerAndStart(tlsConfig), { code: "ENOENT" });
	await reopen(context);
	assert.equal(context.usersStore.getUserByName({ name: "serge" }).isAdmin, true);
});
