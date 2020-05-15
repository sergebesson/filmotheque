/* global objectHash */

import { userListStore } from "../../../stores/user-list.store.mjs";

const userListComponent = {
	events: [ "clickLine" ],
	props: {
		classForOptionalColumns: { type: String, default: "" },
		selectedUserName: { type: String, default: "" },
	},
	data: () => ({
		userListStore,
	}),
	created: async function () {
		if (this.userListStore.users.length === 0) {
			await this.userListStore.getUsers();
		}
	},
	mounted: function () {
		this.updatePaddingHeadersElement();
	},
	updated: function () {
		this.updatePaddingHeadersElement();
	},
	methods: {
		updatePaddingHeadersElement() {
			const headersElement = this.$el.getElementsByClassName("md-subheader")[0];
			const listElement = this.$el.getElementsByClassName("infinite-list")[0];
			if (listElement) {
				const childElement = listElement.children[0];
				headersElement.style.paddingRight = `${listElement.offsetWidth - childElement.offsetWidth}px`;
			}
		},
		hashUser(user) {
			return objectHash(user);
		},
		onClick(user) {
			this.$emit("clickLine", user);
		},
	},
	template: `
		<transition name="fade">
			<div class="user-list md-elevation-3">
				<md-subheader class="md-layout">
					<div class="md-layout-item"/>
					<div class="md-layout-item">nom</div>
					<div class="md-layout-item">mdp</div>
					<div :class="['md-layout-item', classForOptionalColumns]">pseudo</div>
					<div :class="['md-layout-item', classForOptionalColumns]">description</div>
				</md-subheader>
				<md-divider />
				<div v-if="userListStore.users.length === 0 && !userListStore.loading" class="empty">
					Aucun utilisateur
				</div>
				<infinite-list :store-list="userListStore" v-else>
					<div v-for="user in userListStore.users" :key="user.name" class="infinite-list-transition-item">
						<md-list-item @click="onClick(user)" :disabled="selectedUserName === user.name">
						<transition
								enter-active-class="animate__animated animate__flash"
								mode="out-in"
							>
								<div :key="hashUser(user)" class="md-layout" style="width: 100%">
								<avatar :name="user.name" class="md-layout-item"/>
									<div :class="['md-layout-item', { admin: user.is_admin }, { inactive: !user.active }]">
										{{ user.name }}
									</div>
									<password class="md-layout-item">{{ user.password }}</password>
									<div :class="['md-layout-item', classForOptionalColumns]">{{ user.pseudo }}</div>
									<div :class="['md-layout-item', classForOptionalColumns]">{{ user.description }}</div>
								</div>
							</transition>
						</md-list-item>
						<md-divider />
					</div>
				</infinite-list>
			</div>
		</transition>
	`,
};

export { userListComponent };
