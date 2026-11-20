"use strict";

const _ = require("lodash");
const removeAccents = require("remove-accents");
const escapeStringRegexp = require("escape-string-regexp");

function searchDocuments(documents, properties, { query, search = "" }) {
	const searchString = _.isString(search) ? search.trim() : "";
	const filter = RegExp(escapeStringRegexp(removeAccents(searchString))
		.toLowerCase().replace(/\s+/g, ".*"));
	return _.filter(documents, query).filter((document) => {
		const text = properties.reduce((result, property) =>
			`${result} ${_.get(document, property, "")}`, "")
			.trim().replace(/[\s\uFEFF\xA0]{2,}/g, " ");
		return filter.test(removeAccents(text).toLowerCase());
	});
}

module.exports = { searchDocuments };
