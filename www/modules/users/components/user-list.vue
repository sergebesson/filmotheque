<script>
import objectHash from "object-hash";
import Password from "./password.vue";
import { userListStore } from "../../../stores/user-list.store.js";

export default {
	components: { Password },
	props: {
		classForOptionalColumns: { type: String, default: "" },
		selectedUserName: { type: String, default: "" },
	},
	emits: ["clickLine"],
	data: () => ({ userListStore }),
	async created() {
		if (this.userListStore.state.users.length === 0) { await this.userListStore.getUsers(); }
	},
	methods: { hashUser(user) { return objectHash(user); } },
};
</script>

<template>
	<div class="user-list elevation-3">
		<div class="list-subheader user-row">
			<div class="avatar-column" /><div>nom</div><div>mdp</div>
			<div :class="classForOptionalColumns">pseudo</div><div :class="classForOptionalColumns">description</div>
		</div>
		<v-divider />
		<div v-if="userListStore.state.users.length === 0 && !userListStore.state.loading" class="empty">Aucun utilisateur</div>
		<infinite-list v-else :store-list="userListStore">
			<div v-for="user in userListStore.state.users" :key="user.name" class="infinite-list-transition-item" role="listitem">
				<v-list-item :disabled="selectedUserName === user.name" @click="$emit('clickLine', user)">
					<transition enter-active-class="animate__animated animate__flash" mode="out-in">
						<div :key="hashUser(user)" class="user-row">
							<div class="avatar-column"><avatar :name="user.name" :size="30" /></div>
							<div :class="{ admin: user.is_admin, inactive: !user.active }">{{ user.name }}</div>
							<password>{{ user.password }}</password>
							<div :class="classForOptionalColumns">{{ user.pseudo }}</div>
							<div :class="classForOptionalColumns">{{ user.description }}</div>
						</div>
					</transition>
				</v-list-item>
				<v-divider />
			</div>
		</infinite-list>
	</div>
</template>

<style>
.user-list { display: flex; flex-direction: column; height: 100%; overflow: hidden; border-radius: 8px 8px 0 0; }
.user-list .inactive { opacity: .5; }
.user-list .list-subheader { padding: 0; overflow-y: hidden; background: var(--filmotheque-over-background); font-weight: bold; }
.user-list .list-subheader, .user-list .infinite-list { scrollbar-gutter: stable; }
.user-list .infinite-list { flex: 1; }
/* La densité publique ne reproduit pas les lignes de 40px sans padding ; le disabled
 * doit garder sa couleur de sélection sans atténuer le texte ni le flash de contenu. */
.user-list .v-list-item { padding: 0; min-height: 40px; }
.user-list .infinite-list-transition-item:nth-child(2n) { background: #0000000a; }
.user-list .v-list-item--disabled { opacity: 1; font-weight: bold; background: #ff00001a; }
.user-row { display: flex; width: 100%; min-height: 40px; }
.user-row > div { flex: 1; min-width: 0; padding: 0 10px; font-size: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 40px; }
.user-row > .avatar-column { flex: 0 0 60px; padding: 5px 10px 5px 15px; line-height: normal; }
.user-list .empty { padding: 10px 16px; font-size: 1.5em; font-weight: bold; }
</style>
