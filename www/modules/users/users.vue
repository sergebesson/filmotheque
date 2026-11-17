<script>
import { VSnackbar } from "vuetify/components";
import "animate.css";
import UserList from "./components/user-list.vue";
import { userListStore } from "../../stores/user-list.store.js";

export default {
	components: { UserList, VSnackbar },
	beforeRouteUpdate(to, from) {
		if (this.isRouteDetail(from.name)) { return this.confirmToExitDetail(); }
	},
	beforeRouteLeave(to, from) {
		return this.isRouteDetail(from.name) ? this.confirmToExitDetail() : true;
	},
	data: () => ({ userListStore, showNotification: false, notification: "", detailDirty: false }),
	computed: {
		routeDetail() { return this.isRouteDetail(this.$route.name); },
		selectedUserName() { return this.$route.params.name || ""; },
	},
	watch: {
		"$route.fullPath"() { this.detailDirty = false; },
	},
	methods: {
		onClickLine(user) { this.$router.push({ name: "users-edit", params: { name: user.name } }); },
		isRouteDetail(name) { return name === "users-edit" || name === "users-create"; },
		confirmToExitDetail() {
			return !this.detailDirty || window.confirm("Des modifications sont en cours.\nVoulez-vous vraiment quitter la modification de l'utilisateur ?");
		},
		onExit() { this.$router.push({ name: "users-list" }); },
		async refreshUsers() {
			try {
				await userListStore.update();
			} catch {
				// L'avertissement persistant présente l'échec de lecture, sans rejouer l'écriture.
			}
		},
		async userUpdated({ type, user }) {
			this.detailDirty = false;
			await this.refreshUsers();
			// La mutation reste acquise même si la liste n'a pas pu être actualisée.
			switch (type) {
				case "created":
					this.notification = `L'utilisateur '${user.name}' a été créé`;
					this.$router.push({ name: "users-edit", params: { name: user.name } });
					break;
				case "updated": this.notification = `L'utilisateur '${user.name}' a été mis à jour`; break;
				case "deleted":
					this.notification = `L'utilisateur '${user.name}' a été supprimé`;
					this.$router.push({ name: "users-list" });
					break;
				default: return;
			}
			this.showNotification = true;
		},
	},
};
</script>

<template>
	<div class="users" :class="{ 'has-detail': routeDetail }">
		<div v-if="userListStore.state.updateFailed" class="list-refresh-warning" role="status">
			<span>La dernière opération a réussi. La liste n'a pas pu être actualisée. Les données affichées ne sont pas à jour.</span>
			<v-btn :loading="userListStore.state.updating" :disabled="userListStore.state.updating" @click="refreshUsers">Actualiser la liste</v-btn>
		</div>
		<div class="users-panels">
			<div class="users-list-panel">
				<user-list
					:class-for-optional-columns="routeDetail ? 'small-hide' : 'xsmall-hide'"
					:selected-user-name="selectedUserName" @click-line="onClickLine"
				/>
			</div>
			<router-view v-slot="{ Component }">
				<transition name="user-detail" enter-active-class="animate__animated animate__bounceInRight" leave-active-class="animate__animated animate__bounceOutRight" mode="out-in">
					<component :is="Component" v-if="Component" :key="$route.fullPath" @error="onExit" @exit="onExit" @dirty="detailDirty = $event" @updated="userUpdated" />
				</transition>
			</router-view>
		</div>
		<v-snackbar v-model="showNotification" :timeout="2000">{{ notification }}</v-snackbar>
	</div>
</template>

<style>
.users { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.users-panels { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.list-refresh-warning { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 5px 5px 0; padding: 8px 12px; background: var(--filmotheque-over-background); }
.list-refresh-warning span { flex: 1 1 280px; }
.users-list-panel { flex: 1; min-width: 0; padding: 5px 5px 0; }
.users .admin { color: var(--filmotheque-error) !important; font-weight: bold; }
.user-detail-enter-from, .user-detail-leave-to { max-width: 0; margin: 0; }
/* Feuille différée : les colonnes optionnelles appartiennent uniquement à l'administration. */
@media (max-width: 960px) { .users .small-hide { display: none !important; } }
@media (max-width: 600px) {
	.users .xsmall-hide { display: none !important; }
	.users.has-detail .users-list-panel { display: none; }
}
</style>
