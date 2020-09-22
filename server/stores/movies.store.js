"use strict";

const _ = require("lodash");
const path = require("path");
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const fs = require("fs").promises;

const { JsonDb } = require("@sbesson/json-db");

class MoviesStore {
	constructor({ configLoader, logger }) {
		const directory = configLoader.getValue("storage.databaseDirectory");
		this.logger = logger;
		this.structureJsonDb = {
			jsonSchema: {
				type: "object",
				properties: {
					_id: { type: "string" },
					title: { type: "string" },
					categories: { type: "string" },
					file_name: { type: "string" },
					date_added: { type: "string", format: "date" },
					themoviedb_id: { type: "string" },
					allocine_id: { type: "string" },
					imdb_id: { type: "string" },
					size: { type: "integer" },
				},
				additionalProperties: false,
				required: [ "_id", "title", "file_name", "date_added", "size" ],
			},
			searchIndex: [ "title", "categories" ],
		};

		this.jsonDb = new JsonDb(path.join(directory, "filmotheque"));
	}

	async initialize() {
		return await this.jsonDb.loadCollection();
	}

	async importMovies({ directory }) {
		await this.jsonDb.create(this.structureJsonDb);
		const regExp = /\s*(.*\S)\s*(\(\d\d-\d\d\)|\(\d{4}\))\s*(\S*)\s*(.+)/;

		const fileNames = await fs.readdir(directory);
		const badFiles = [];
		const movies = await Promise.all(fileNames.map(async(fileName) => {
			try {
				const fileStat = await fs.stat(path.join(directory, fileName));
				const [ , title, , categories, ids ] = regExp.exec(fileName);
				const [ , theMovieDbId ] = ids.split("@");
				const [ , alloCineId ] = ids.split("#");
				const [ , imdbId ] = ids.split("$");
				return {
					title,
					categories,
					file_name: fileName,
					date_added: fileStat.mtime.toISOString().split("T")[0],
					themoviedb_id: theMovieDbId,
					allocine_id: alloCineId,
					imdb_id: imdbId,
					size: fileStat.size,
				};
			} catch (error) {
				badFiles.push({ file_name: fileName, error: error.message });
				this.logger.log("warn", `films ${ fileName } en erreur: ${ error.message}`);
			}
		}));
		const resultImport = await this.jsonDb.import(_.compact(movies));

		return {
			bad_files: badFiles,
			success: resultImport.success,
			number_inserted_movies: resultImport.numberDocumentsInserted,
			number_error_movies: resultImport.DocumentsInError,
			movies_in_error: resultImport.documentsInError,
		};
	}

	search({ query, search }) {
		// a étudier : accent-folding
		return this.jsonDb.collection.search({ query, search });
	}

	get({ id }) {
		return this.jsonDb.collection.getById(id);
	}
}

module.exports = { MoviesStore };
