import { helpers } from "@vuelidate/validators";

const oneOf = (values) => helpers.withParams(
	{ type: "oneOf", values },
	(value) => !helpers.req(value) || values.includes(value),
);

export { oneOf };
