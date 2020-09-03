"use strict";

const _ = require("lodash");
const path = require("path");
const fastGlob = require("fast-glob");
const requireYml = require("require-yml");
const traverse = require("traverse");
const swaggerParser = require("swagger-parser");
const swaggerUiExpress = require("swagger-ui-express");
const {
	OpenApiValidator,
	BadRequest,
	Forbidden,
	InternalServerError,
	MethodNotAllowed,
	NotFound,
	RequestEntityToLarge,
	Unauthorized,
	UnsupportedMediaType,
} = require("express-openapi-validator");

class OpenapiService {
	static async install(router) {

		const apiSpec = await OpenapiService.getApiSpec();

		router.use("/", swaggerUiExpress.serve);
		router.get("/", swaggerUiExpress.setup(apiSpec, {
			swaggerOptions: {
				defaultModelRendering: "model",
				displayRequestDuration: true,
				docExpansion: "none",
				filter: true,
				showCommonExtensions: true,
			},
			customCss: ".swagger-ui section.models, .swagger-ui .topbar { display: none }",
		}));

		await new OpenApiValidator({
			apiSpec: apiSpec,
			validateRequests: true,
			validateResponses: true,
		}).install(router);
	}

	static async getApiSpec() {
		const openapi = requireYml({ targets: "../openapi/openapi.yml", rootDir: __dirname });
		traverse(openapi).forEach(function (value) {
			/* eslint-disable no-invalid-this */
			if (this.key === "$ref" && !value.startsWith("#")) {
				this.update(path.join(__dirname, "../openapi", value));
			}
			/* eslint-enable no-invalid-this */
		});

		const modulesPath = path.join(__dirname, "../modules");
		const openapiFiles = await fastGlob("./*/openapi/openapi.yml", { cwd: modulesPath });
		openapiFiles.forEach((openapiFile) => {
			const openapiDir = path.dirname(openapiFile);
			const openapiModule = requireYml({ targets: openapiFile, rootDir: modulesPath });
			traverse(openapiModule).forEach(function (value) {
				/* eslint-disable no-invalid-this */
				if (this.key === "$ref" && !value.startsWith("#")) {
					this.update(path.join(modulesPath, openapiDir, value));
				}
				/* eslint-enable no-invalid-this */
			});
			const nameModule = path.join(openapiDir, "..");
			openapi.tags = [ ...openapi.tags, ...openapiModule.tags ];
			openapi.paths = {
				...openapi.paths,
				..._.mapKeys(
					openapiModule.paths,
					(value, openapiPath) => _.trimEnd(`/${nameModule}${openapiPath}`, "/"),
				),
			};
		});

		const apiSpec = await swaggerParser.validate(openapi);
		return apiSpec;
	}

	static middlewareError({ logger }) {
		return (error, request, response, next) => {
			if (error instanceof BadRequest) {
				return response.status(error.status).json({
					status: error.status, error_description: error.name, errors: error.errors,
				});
			}

			if (error instanceof Forbidden ||
					error instanceof MethodNotAllowed ||
					error instanceof NotFound ||
					error instanceof RequestEntityToLarge ||
					error instanceof Unauthorized ||
					error instanceof UnsupportedMediaType ||
					error instanceof InternalServerError) {

				if (error instanceof InternalServerError) {
					logger.log("error", `openapi validator path ${ error.path }`);
					logger.log("error", "openapi validator errors", error.errors);
					logger.log("error", error.stack);
				}
				return response.status(error.status).json({
					status: error.status, error_description: error.name,
				});
			}

			next(error);
		};
	}

}

module.exports = { OpenapiService };
