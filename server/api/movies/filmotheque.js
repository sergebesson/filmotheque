"use strict";

const _ = require("lodash");
const path = require("path");
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const fs = require("fs").promises;
const escapeStringRegexp = require("escape-string-regexp");
const removeAccents = require("remove-accents");

const { CollectionFile } = require("sb-collection-file");

class Filmotheque {
	constructor(directory, logger) {
		this.directory = directory;
		this.logger = logger;
		this.filmothequeJsonSchema = {
			type: "object",
			properties: {
				_id: { type: "string" },
				title: { type: "string" },
				fileName: { type: "string" },
				dateAdded: { type: "string", format: "date" },
				idTheMovieDb: { type: "string" },
				idAlloCine: { type: "string" },
				idImdb: { type: "string" },
				size: { type: "integer" },
				_search: { type: "string" },
			},
			additionalProperties: false,
			required: [ "_id", "title", "fileName", "dateAdded", "size" ],
		};

		this.collectionFile = new CollectionFile(path.join(directory, "filmotheque"));
	}

	async loadMovies() {
		return await this.collectionFile.loadCollection();
	}

	async importMovies(directory) {
		await this.collectionFile.create({ jsonSchema: this.filmothequeJsonSchema });
		const regExp = /\s*(.*\S)\s*(\(\d\d-\d\d\)|\(\d{4}\))\s*(.+)/;

		const fileNames = await fs.readdir(directory);
		const badFiles = [];
		const movies = await Promise.all(fileNames.map(async(fileName) => {
			try {
				const fileStat = await fs.stat(path.join(directory, fileName));
				const [ , title, , ids ] = regExp.exec(fileName);
				const [ , idTheMovieDb ] = ids.split("@");
				const [ , idAlloCine ] = ids.split("#");
				const [ , idImdb ] = ids.split("$");
				return {
					title,
					fileName,
					dateAdded: fileStat.mtime.toISOString().split("T")[0],
					idTheMovieDb,
					idAlloCine,
					idImdb,
					size: fileStat.size,
					_search: removeAccents(title).toLowerCase(),
				};
			} catch (error) {
				badFiles.push({ fileName, error: error.message });
				this.logger.log("warn", `films ${ fileName } en erreur: ${ error.message}`);
			}
		}));
		const resultImport = await this.collectionFile.import(_.compact(movies));

		return Object.assign({ badFiles }, resultImport);
	}

	find(query) {
		// a étudier : accent-folding
		if (!query) {
			return this.collectionFile.collection.find();
		}

		const filterRegExp = RegExp(
			escapeStringRegexp(removeAccents(query.trim()))
				.toLowerCase()
				.replace(/\s+/g, ".*"),
		);
		return this.collectionFile.collection.find(
			(movie) => filterRegExp.test(movie._search),
		);
	}

	get(id) {
		return this.collectionFile.collection.getById(id);
	}
}

module.exports = { Filmotheque };
