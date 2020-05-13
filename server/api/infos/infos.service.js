"use strict";

const path = require("path");
const { version } = require("../../../package.json");
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const fs = require("fs").promises;
const markdownIt = require("markdown-it")({ html: true });

class InfosService {
	constructor({ filmotheque, logger }) {
		this.collectionFile = filmotheque.collectionFile;
		this.logger = logger;
	}

	async get() {
		const infos = { version, nbMovies: this.collectionFile.collection.length };
		const flashFileName = path.join(__dirname, "../../../data/flash.md");
		try {
			await fs.access(flashFileName);
			const flashMarkdown = await fs.readFile(flashFileName, "utf8");
			infos.flash = markdownIt.render(flashMarkdown);
		} catch (error) {
			this.logger.log("warn", "error read flash", { error: error.message });
		}
		return infos;
	}
}

module.exports = { InfosService };
