const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Server } = require("../../server/server.js");
const { MoviesStore } = require("../../server/stores/movies.store.js");
const { UsersStore } = require("../../server/stores/users.store.js");

async function main() {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "filmotheque-test-"));
	process.once("exit", () => fs.rmSync(directory, { recursive: true, force: true }));
	const configLoader = { getValue: () => directory };
	const movies = new MoviesStore({ configLoader });
	const users = new UsersStore({ configLoader });
	await movies.jsonDb.create(movies.structureJsonDb);
	await users.jsonDb.create(users.structureJsonDb);
	for (const user of [
		{ name: "serge", password: "test-admin", pseudo: "Administrateur", description: "Compte de test", sexe: "M" },
		{ name: "alice", password: "test-alice", pseudo: "Alice", description: "Lectrice de test", sexe: "F" },
		{ name: "bruno", password: "test-bruno", pseudo: "Bruno", description: "Lecteur de test", sexe: "M" },
	]) {
		await users.insert(user);
	}
	for (let index = 1; index <= 24; index++) {
		const title = `Film de test ${String(index).padStart(2, "0")}`;
		fs.writeFileSync(path.join(directory, `${title}.avi`), "Contenu de test");
		await movies.jsonDb.insert({
			_id: String(index), title, file_name: `${title}.avi`,
			date_added: index <= 17 ? "2026-03-17" : "2025-12-06", size: index * 1048576,
			themoviedb_id: "72545", allocine_id: "144687", imdb_id: "tt1397514",
		});
	}
	const configuration = path.join(directory, "configuration.json");
	fs.writeFileSync(configuration, JSON.stringify({
		storage: { databaseDirectory: directory, moviesDirectory: directory },
		server: { port: 4173, host: "localhost", url_server: "localhost" },
		logs: { file: path.join(directory, "server.log"), level: "error" },
		vuejs: { pageSize: 3 },
	}));
	await Server.createServerAndStart(configuration);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
