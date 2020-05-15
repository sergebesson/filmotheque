/* global window */

import { flashStore } from "../../stores/flash.store.mjs";
import { meStore } from "../../stores/me.store.mjs";

const profileComponent = {
	data: () => ({ meStore }),
	created: async function () {
		await meStore.loadMe();
	},
	methods: {
		logout: async function () {
			const xhr = new window.XMLHttpRequest();
			xhr.addEventListener("loadend", () => {
				window.location.assign("/logout");
			});
			xhr.open("HEAD", window.location.href, true, "logout", "logout");
			xhr.send(null);
		},
		aPropos: function () {
			flashStore.showFlash();
		},
	},
	template: `
		<md-menu md-size="auto" md-align-trigger class="profile" v-if="meStore.name">
			<md-button md-menu-trigger class="md-icon-button">
				<avatar :name="meStore.name"/>
			</md-button>
			<md-menu-content>
				<md-menu-item @click="logout">
					<md-icon>exit_to_app</md-icon>
					<span>déconnexion</span>
				</md-menu-item>
				<md-divider />
				<md-menu-item href="/api" target="_blank">
					<md-icon>api</md-icon>
					<span>api</span>
				</md-menu-item>
				<md-menu-item @click="aPropos">
					<md-icon>info</md-icon>
					<span>à propos</span>
				</md-menu-item>
			</md-menu-content>
		</md-menu>
	`,
};

export { profileComponent };
