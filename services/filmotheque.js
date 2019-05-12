"use strict";

const _ = require("lodash");
const path = require("path");
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const fs = require("fs").promises;
const { markdown } = require("markdown");

const { CollectionFile } = require("sb-collection-file");
const { version } = require("../package.json");

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
				dateAdded: { type: "string", format: "date-time" },
				idTheMovieDb: { type: "string" },
				idAlloCine: { type: "string" },
				idImdb: { type: "string" },
				size: { type: "integer" },
			},
			additionalProperties: false,
			required: [ "_id", "title", "fileName", "dateAdded", "size" ],
		};

		this.collectionFile = new CollectionFile(path.join(directory, "filmotheque"));
	}

	importMovies(directory) {
		this.collectionFile.create({ jsonSchema: this.filmothequeJsonSchema });
		const regExt = /\s*(.*\S)\s*(\(\d\d-\d\d\)|\(\d{4}\))\s*(.+)/;
		return fs.readdir(directory)
			.then((fileNames) => {
				const badFiles = [];
				return Promise.all(_.map(fileNames, (fileName) => {
					return fs.stat(path.join(directory, fileName))
						.then((fileStat) => {
							const [ , title, , ids ] = regExt.exec(fileName);
							const [ , idTheMovieDb ] = ids.split("@");
							const [ , idAlloCine ] = ids.split("#");
							const [ , idImdb ] = ids.split("$");
							return {
								title,
								fileName,
								dateAdded: fileStat.mtime.toISOString(),
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
					.then((movies) => this.collectionFile.import(_.compact(movies)))
					.then((resultImport) => {
						return _.assign({ badFiles }, resultImport);
					});
			});
	}

	infos() {
		return this.collectionFile.getNbDocuments()
			.then((nbMovies) => {
				const infos = { version, nbMovies };
				const flashFileName = path.join(__dirname, "../data/flash.md");
				this.logger.log("debug", "Filmotheque::infos", { flashFileName });
				return fs.access(flashFileName)
					.then(() => fs.readFile(flashFileName, "utf8"))
					.then((flashMarkdown) => _.assign(
						infos, { flash: markdown.toHTML(flashMarkdown) }
					))
					.catch((error) => {
						this.logger.log("info", "infos", { error: error.message });
						return infos;
					});
			});
	}

	find(query) {
		return this.collectionFile.find(query);
	}

	get(id) {
		return this.collectionFile.getById(id);
	}
}

module.exports = { Filmotheque };
