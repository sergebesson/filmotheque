"use strict";
/* eslint-disable no-sync */

const path = require("path");
const fs = require("node:fs/promises");
const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const { searchDocuments } = require("../services/search");

class MoviesStore {
	constructor({ database, logger }) {
		this.database = database;
		this.logger = logger;
		this.importPromise = null;
		const ajv = new Ajv({ allErrors: true });
		ajvFormats(ajv);
		this.validate = ajv.compile({
			type: "object",
			properties: {
				_id: { type: "string" },
				title: { type: "string" },
				categories: { type: "string" },
				file_name: { type: "string" },
				date_added: { type: "string", format: "date" },
				themoviedb_id: { type: "string", pattern: "^[0-9]+$" },
				allocine_id: { type: "string" },
				imdb_id: { type: "string" },
				size: { type: "integer" },
			},
			additionalProperties: false,
			required: [ "_id", "title", "file_name", "date_added", "size", "themoviedb_id" ],
		});
	}

	// eslint-disable-next-line class-methods-use-this, no-empty-function
	async initialize() {}

	importMovies({ directory }) {
		if (this.importPromise) {
			return Promise.reject(new Error("importInProgress"));
		}
		this.importPromise = this.database.run(() => this.importDirectory(directory))
			.finally(() => {
				this.importPromise = null;
			});
		return this.importPromise;
	}

	async importDirectory(directory) {
		const regExp = /\s*(.*\S)\s*(\(\d\d-\d\d\)|\(\d{4}\))\s*(\S*)\s*(.+)/;
		const fileNames = (await fs.readdir(directory)).sort();
		const inventory = await Promise.all(fileNames.map(async(fileName) => {
			try {
				const fileStat = await fs.stat(path.join(directory, fileName));
				if (!fileStat.isFile()) {
					throw new Error("Ce chemin n’est pas un fichier");
				}
				const parsed = regExp.exec(path.parse(fileName).name);
				if (!parsed) {
					throw new Error("Nom de fichier invalide");
				}
				const [ , title, , categories, ids ] = parsed;
				const tmdb = /@([0-9]+)(?=$|[@#\s$])/.exec(ids)?.[1];
				if (!tmdb) {
					throw new Error("Identifiant TMDB absent ou invalide");
				}
				return { document: {
					_id: tmdb, title, categories, file_name: fileName,
					date_added: fileStat.mtime.toISOString().split("T")[0],
					themoviedb_id: tmdb,
					allocine_id: /#([^@#$\s]+)/.exec(ids)?.[1],
					imdb_id: /\$([^@#$\s]+)/.exec(ids)?.[1],
					size: fileStat.size,
				} };
			} catch (error) {
				return { error: { file_name: fileName, error: error.message } };
			}
		}));

		const badFiles = [];
		const moviesInError = [];
		const movies = new Map();
		for (const entry of inventory) {
			const movie = entry.document;
			if (entry.error) {
				badFiles.push(entry.error);
			} else if (!this.validate(movie)) {
				moviesInError.push({ error: "invalidDocument", document: movie });
			} else if (movies.has(movie._id)) {
				badFiles.push({ file_name: movie.file_name,
					error: `Doublon TMDB ${movie._id} : fichier retenu « ${movies.get(movie._id).file_name} », fichier rejeté « ${movie.file_name} »`,
				});
			} else {
				movies.set(movie._id, movie);
			}
		}
		for (const error of badFiles) {
			this.logger.log("warn", `films ${error.file_name} en erreur: ${error.error}`);
		}
		const report = {
			bad_files: badFiles,
			success: badFiles.length + moviesInError.length === 0,
			number_inserted_movies: movies.size,
			number_error_movies: badFiles.length + moviesInError.length,
			movies_in_error: moviesInError,
		};
		if (movies.size === 0) {
			return { ...report, success: false, refusal_reason: "Aucun film valide trouvé ; catalogue conservé" };
		}
		this.database.root.transactionSync(() => {
			this.database.movies.clearSync();
			for (const [ id, movie ] of movies) {
				this.database.movies.putSync(id, movie);
			}
		});
		await this.database.flush();
		return report;
	}

	search({ query, search }) {
		const documents = Array.from(this.database.movies.getRange(), ({ value }) => value);
		return searchDocuments(documents, [ "title", "categories" ], { query, search });
	}

	get({ id }) {
		return this.database.movies.get(id);
	}

	count() {
		return this.database.movies.getCount();
	}
}

module.exports = { MoviesStore };
