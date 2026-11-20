const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Server } = require("../../server/server.js");
const { Database } = require("../../server/services/database.js");
const { UsersStore } = require("../../server/stores/users.store.js");

async function main() {
	for (const key of ["PORT", "HOST", "URL_SERVER", "SSL_ENABLE", "MOVIES_DIR", "DB_DIR", "LOGS_FILE", "LOGS_LEVEL"]) {
		delete process.env[key];
	}
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "filmotheque-test-"));
	process.once("exit", () => fs.rmSync(directory, { recursive: true, force: true }));
	const configLoader = { getValue: () => directory };
	const database = await Database.open({ configLoader });
	try {
		const users = new UsersStore({ database });
		for (const user of [
			{ name: "serge", password: "test-admin", pseudo: "Administrateur", description: "Compte de test", sexe: "M" },
			{ name: "alice", password: "test-alice", pseudo: "Alice", description: "Lectrice de test", sexe: "F" },
			{ name: "bruno", password: "test-bruno", pseudo: "Bruno", description: "Lecteur de test", sexe: "M" },
		]) {
			await users.insert(user);
		}
		for (let index = 1; !process.argv.includes("--empty") && index <= 24; index++) {
			const title = `Film de test ${String(index).padStart(2, "0")}`;
			const tmdb = String(72544 + index);
			fs.writeFileSync(path.join(directory, `${title}.avi`), "Contenu de test");
			database.root.transactionSync(() => database.movies.putSync(tmdb, {
				_id: tmdb, title, file_name: `${title}.avi`,
				date_added: index <= 17 ? "2026-03-17" : "2025-12-06", size: index * 1048576,
				themoviedb_id: tmdb, allocine_id: "144687", imdb_id: "tt1397514",
			}));
		}
	} finally {
		await database.close();
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
