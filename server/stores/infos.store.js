"use strict";

const path = require("path");
const { version } = require("../../package.json");
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const fs = require("fs").promises;
const markdownIt = require("markdown-it")({ html: true });

class InfosStore {
	constructor(context) {
		this.context = context;
		this.logger = context.logger;
		this.flash = "";
	}

	async initialize() {
		const flashFileName = path.join(__dirname, "flash.md");
		try {
			await fs.access(flashFileName);
			const flashMarkdown = await fs.readFile(flashFileName, "utf8");
			this.flash = markdownIt.render(flashMarkdown);
		} catch (error) {
			this.logger.log("warn", "error read flash", { error: error.message });
		}
	}

	async get() {
		return {
			version,
			number_of_movies: this.context.moviesStore.collectionFile.collection.length,
			flash: this.flash,
		};
	}
}

module.exports = { InfosStore };
