/* global validators */

const oneOf = (values) => validators.helpers.withParams(
	{ type: "oneOf", values },
	(value) => !validators.helpers.req(value) || values.includes(value),
);

export {
	oneOf,
};
