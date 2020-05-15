"use strict";

const _ = require("lodash");
const requireGlob = require("require-glob");
const path = require("path");

class ModulesService {
	constructor() {
		this.routeAccessRights = {
			admin: [],
			all: [],
		};
	}

	async initialize({ path: modulesPath, router, context }) {
		/* les modules sont sous la forme :
		{
			<nom du module>: {
				<fichier .module sans le .js>: {
					authorizedRoutes: {
						admin: array de regExp des authorizedRoutes d'administration (facultatif)
						all: array de regExp des routes autorisées pour tout utilisateur logué (facultatif)
					} (obligatoire)
					routerFactory: function permettant de créer un router contenant les routes du modules (obligatoire)
				}
			}
		}
		*/
		const modules = await ModulesService.loadModules({ modulesPath });

		this.updateRouteAccessRights({ modules });
		this.updateRouter({ modules, router, context });
	}

	static async loadModules({ modulesPath }) {
		return await requireGlob(
			"*/*.module.js", {
				cwd: modulesPath,
				keygen: (option, fileObj) => {
					const uniquePath = fileObj.path.replace(fileObj.base, "");
					const parsedPath = path.parse(uniquePath);

					return `${parsedPath.dir}/${parsedPath.name}`.split("/")
						.filter((value) => value !== "");
				},
			},
		);
	}

	static _modulesForEach(modules, iterator) {
		_.forEach(modules, (moduleList, pathModule) => {
			_.forEach(moduleList, (module) => {
				iterator({ module, pathModule });
			});
		});
	}

	updateRouteAccessRights({ modules }) {
		ModulesService._modulesForEach(modules, ({ module, pathModule }) => {
			this.routeAccessRights.admin = this.routeAccessRights.admin.concat(
				_.get(module, "authorizedRoutes.admin", [])
					.map((routeRegExp) => new RegExp(`^/${pathModule}${routeRegExp}$`)),
			);
			this.routeAccessRights.all = this.routeAccessRights.all.concat(
				_.get(module, "authorizedRoutes.all", [])
					.map((routeRegExp) => new RegExp(`^/${pathModule}${routeRegExp}$`)),
			);
		});
	}

	updateRouter({ modules, router, context }) {
		router.use((request, response, next) => {
			const loginUser = context.usersStore.loginUser;
			if (
				this.routeAccessRights.all.some((routeRegExp) => routeRegExp.test(request.path)) ||
				(loginUser.isAdmin && this.routeAccessRights.admin
					.some((routeRegExp) => routeRegExp.test(request.path)))
			) {
				return next();
			}

			response.status(401).json({
				status: 401,
				error_description: "Unauthorized",
			});
		});

		ModulesService._modulesForEach(modules, ({ module, pathModule }) => {
			if (_.isFunction(module.routerFactory)) {
				router.use(`/${ pathModule }`, module.routerFactory(context));
			}
		});

	}
}

module.exports = { ModulesService };
