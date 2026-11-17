/* global Vue, window, _ */

import { passwordComponent } from "./components/password.mjs";
import { userListComponent } from "./components/user-list.mjs";
import { userDetail } from "./components/user-detail.mjs";
import { userListStore } from "../../stores/user-list.store.mjs";

Vue.component("password", passwordComponent);
Vue.component("list-users", userListComponent);

const usersComponent = {
	data: () => ({
		showNotification: false,
		notification: "",
		selectedUserName: "",
	}),
	computed: {
		routeDetail: (vm) => vm.isRouteDetail(vm.$route.name),
	},
	template: `
		<transition name="fade">
			<div class="users">
				<div :class="{ 'md-xsmall-hide': routeDetail }">
					<list-users
						:classForOptionalColumns="routeDetail ? 'md-small-hide' : 'md-xsmall-hide'"
						@clickLine="onClickLine"
						:selectedUserName.sync="selectedUserName"
					/>
				</div>
				<transition
					name="user-detail"
					enter-active-class="animate__animated animate__bounceInRight"
					leave-active-class="animate__animated animate__bounceOutRight"
				>
					<router-view
						@error="onExit"
						@exit="onExit"
						@dirty="detailDirty = $event"
						@updated="userUpdated"
					/>
				</transition>
				<md-snackbar :md-duration="2000" :md-active.sync="showNotification">
					{{ notification }}
				</md-snackbar>
			</div>
		</transition>
	`,
	created() {
		this.detailDirty = false;
	},
	beforeRouteEnter(to, from, next) {
		next((vm) => {
			vm.selectedUserName = _.get(to.params, "name", "");
		});
	},
	beforeRouteUpdate(to, from, next) {
		if (!this.isRouteDetail(from.name)) {
			return next();
		}
		if (this.confirmToExitDetail()) {
			this.selectedUserName = _.get(to.params, "name", "");
			return next();
		}
		next(false);
	},
	beforeRouteLeave(to, from, next) {
		next(this.isRouteDetail(from.name) ? this.confirmToExitDetail() : true);
	},
	methods: {
		onClickLine(user) {
			this.$router.push({ name: "users-edit", params: { name: user.name } });
		},
		isRouteDetail(name) {
			return name === "users-edit" || name === "users-create";
		},
		confirmToExitDetail: function () {
			if (this.detailDirty) {
				// eslint-disable-next-line no-alert
				return window.confirm(
					"Des modifications sont en cours.\nVoulez-vous vraiment quitter la modification de l'utilisateur ?",
				);
			}
			return true;
		},
		onExit() {
			this.$router.push({ name: "users-list" });
		},
		userUpdated({ type, user }) {
			userListStore.update();
			switch (type) {
				case "created":
					this.notification = `L'utilisateur '${ user.name }' a été créé`;
					this.showNotification = true;
					this.$router.push({ name: "users-edit", params: { name: user.name } });
					break;
				case "updated":
					this.notification = `L'utilisateur '${ user.name }' a été mis à jour`;
					this.showNotification = true;
					break;
				case "deleted":
					this.notification = `L'utilisateur '${ user.name }' a été supprimé`;
					this.showNotification = true;
					this.$router.push({ name: "users-list" });
					break;
				default:
					break;
			}
		},
	},
};

const usersRouter = [ {
	name: "users-list",
	path: "list",
}, {
	name: "users-edit",
	path: "edit/:name",
	component: userDetail,
	props: true,
}, {
	name: "users-create",
	path: "create",
	component: userDetail,
	props: { createMode: true },
} ];

export { usersComponent, usersRouter };
