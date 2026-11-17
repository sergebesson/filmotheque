<script>
import { infosStore } from "../../stores/infos.store.js";
import { meStore } from "../../stores/me.store.js";

export default {
	data: () => ({ meStore }),
	async created() { await meStore.loadMe(); },
	methods: {
		logout() {
			const xhr = new window.XMLHttpRequest();
			xhr.addEventListener("loadend", () => window.location.assign("/logout"));
			xhr.open("HEAD", window.location.href, true, "logout", "logout");
			xhr.send(null);
		},
		aPropos() { infosStore.showFlash(); },
	},
};
</script>

<template>
	<div class="profile">
		<v-menu v-if="meStore.name">
			<template #activator="{ props }">
				<v-btn v-bind="props" icon aria-label="Profil"><avatar :name="meStore.name" /></v-btn>
			</template>
			<v-list>
				<v-list-item prepend-icon="exit_to_app" title="déconnexion" @click="logout" />
				<v-divider />
				<v-list-item prepend-icon="api" href="/api" target="_blank" title="api" />
				<v-list-item prepend-icon="info" title="à propos" @click="aPropos" />
			</v-list>
		</v-menu>
	</div>
</template>
