<script>
import { meStore } from "../../stores/me.store.js";
import Loader from "../loader/loader.vue";
import ErrorDialog from "../error/error.vue";
import Flash from "../flash/flash.vue";
import Navigation from "../navigation/navigation.vue";
import Profile from "../profile/profile.vue";
import "./filmotheque.css";

// Les chargements partagés restent hors des routes : Profile charge meStore,
// Flash charge infosStore puis applique le titre et l'annonce de version.
// Ils démarrent en parallèle des listes ; cette racine garde le loader tant que meStore.name est absent.
export default {
	components: { Loader, ErrorDialog, Flash, Navigation, Profile },
	data: () => ({ meStore }),
};
</script>

<template>
	<v-app class="filmotheque">
		<loader v-if="!meStore.name" />
		<error-dialog />
		<flash />
		<div v-show="meStore.name" class="content">
			<div class="elevation-10">
				<header class="header">
					<navigation v-if="meStore.isAdmin" />
					<router-view name="tools-bar" />
					<profile />
				</header>
				<router-view name="main" />
			</div>
		</div>
	</v-app>
</template>
