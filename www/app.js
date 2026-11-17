import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, md } from "vuetify/iconsets/md";
import { fr } from "vuetify/locale";
import {
	VApp, VAvatar, VBtn, VCard, VCardActions, VCardText, VDialog, VDivider, VIcon,
	VList, VListItem, VMenu, VNavigationDrawer, VSpacer,
	VTextField, VToolbar, VTooltip,
} from "vuetify/components";
import "vuetify/styles";

import { configurationStore } from "./stores/configuration.store.js";
import { eventBus, eventName } from "./eventBus.js";
import { router } from "./router.js";
import Filmotheque from "./modules/filmotheque/filmotheque.vue";
import Spinner from "./modules/common/spinner/spinner.vue";
import InfiniteList from "./modules/common/infinite-list/infinite-list.vue";
import Search from "./modules/common/search/search.vue";
import Avatar from "./modules/avatar/avatar.vue";

async function main() {
	// La configuration est disponible avant toute création de composant ou requête de liste.
	await configurationStore.load();
	// La palette CSS commune est déjà chargée, y compris pour le loader avant montage.
	const palette = getComputedStyle(document.documentElement);
	const primary = palette.getPropertyValue("--filmotheque-primary").trim();
	const error = palette.getPropertyValue("--filmotheque-error").trim();
	const app = createApp(Filmotheque);
	app.use(createVuetify({
		components: {
			VApp, VAvatar, VBtn, VCard, VCardActions, VCardText, VDialog, VDivider, VIcon,
			VList, VListItem, VMenu, VNavigationDrawer, VSpacer,
			VTextField, VToolbar, VTooltip,
		},
		icons: { defaultSet: "md", aliases, sets: { md } },
		locale: { locale: "fr", messages: { fr } },
		theme: {
			defaultTheme: "filmotheque",
			themes: {
				filmotheque: {
					dark: false,
					colors: { primary, secondary: error, error },
				},
			},
		},
		defaults: {
			VBtn: { variant: "text", size: "small" },
			VDialog: { contentClass: "filmotheque-dialog", VCard: { rounded: "15px" } },
			VTextField: { variant: "underlined", density: "compact", color: "primary" },
			VSelect: { variant: "underlined", density: "compact", color: "primary" },
		},
	}));
	app.use(router);
	for (const [name, component] of Object.entries({
		Spinner, InfiniteList, Search, Avatar,
	})) {
		app.component(name, component);
	}
	// Recours pour les erreurs Vue non consommées : présentées via ERROR, sans relance.
	// Elles ne sont donc pas nécessairement visibles comme exceptions navigateur (pageerror).
	app.config.errorHandler = (error) => {
		eventBus.emit(eventName.ERROR, { message: "Une erreur est survenue", error });
	};
	await router.isReady();
	app.mount("#filmotheque");
	document.getElementById("loader").remove();
}

main().catch((error) => location.replace(`/error.html?message=${encodeURIComponent(error.message)}`));
