"use strict";

const _ = require("lodash");
const path = require("path");
const fs = require("fs").promises;
const { CollectionFile } = require("sb-collection-file");

class Filmotheque {
	constructor(directory, logger) {
		this.logger = logger;
		this.filmothequeJsonSchema = {
			type: "object",
			properties: {
				_id: { type: "string" },
				name: { type: "string" },
				fileName: { type: "string" },
				dateAdded: { type: "string", format: "date-time" },
				idTheMovieDb: { type: "string" },
				idAlloCine: { type: "string" },
				idImdb: { type: "string" },
				size: { type: "integer" },
			},
			additionalProperties: false,
			required: [ "_id", "name", "fileName", "dateAdded", "size" ],
		};

		this.collectionFile = new CollectionFile(path.join(directory, "filmotheque"));
	}

	initialize(directory) {
		this.collectionFile.create({ jsonSchema: this.filmothequeJsonSchema });		// const regExt = /(\S.*\S)\s*\(\d\d-\d\d\).+@(\d+)/;
		const regExt = /\s*(.*\S)\s*(\(\d\d-\d\d\)|\(\d{4}\))\s*(.+)/;
		return fs.readdir(directory)
			.then((fileNames) => {
				const badFiles = [];
				return Promise.all(_.map(fileNames, (fileName) => {
					return fs.stat(path.join(directory, fileName))
						.then((fileStat) => {
							const [ , name, , ids ] = regExt.exec(fileName);
							const [ , idTheMovieDb ] = ids.split("@");
							const [ , idAlloCine ] = ids.split("#");
							const [ , idImdb ] = ids.split("$");
							return {
								name,
								fileName,
								dateAdded: fileStat.birthtime.toISOString(),
								idTheMovieDb,
								idAlloCine,
								idImdb,
								size: fileStat.size,
							};
						})
						.catch((error) => {
							badFiles.push({ fileName, error: error.message });
							this.logger.log("warn", `films ${ fileName } en erreur: ${ error.message}`);
						});
				}))
					.then((films) => this.collectionFile.import(_.compact(films)))
					.then((resultImport) => {
						return _.assign({ badFiles }, resultImport);
					});
			});
	}

	find(query) {
		return this.collectionFile.find(query);
	}
}

module.exports = { Filmotheque };
