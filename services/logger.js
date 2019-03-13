"use strict";

const _ = require("lodash");
const { createLogger, format: { combine, errors, timestamp, printf }, transports } = require("winston");

class Logger {
	constructor({ file, max_size: maxSize, max_files: maxFiles, level = "debug" }) {
		this.file = file;
		this.maxSize = maxSize;
		this.maxFiles = maxFiles;
		this.level = level;
	}

	getLogger() {

		const myFormat = printf((info) => {
			const { timestamp: time, level, message } = info;
			const otherInfo = _.omit(info, [ "timestamp", "level", "message" ]);
			return `${time} [${level}] ${message} ${
				_.isEmpty(otherInfo) ? "" : JSON.stringify(otherInfo)
			}`;
		});

		return createLogger({
			level: this.level,
			format: combine(
				errors({ stack: true }),
				timestamp(),
				myFormat
			),
			transports: [
				new transports.File({
					filename: this.file,
					maxsize: this.maxSize,
					maxFiles: this.maxFiles,
				}),
			],
		});
	}
}

module.exports = { Logger };
