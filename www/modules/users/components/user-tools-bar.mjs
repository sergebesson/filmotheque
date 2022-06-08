
import { userListStore } from "../../../stores/user-list.store.mjs";

const userToolsBarComponent = {
	data: () => ({
		userListStore,
	}),
	template: `
		<div class="user-tools-bar tools-bar">
			<search class="tools-bar-flex1" :store-list="userListStore" />
			<user-create />
		</div>
	`,
};

export { userToolsBarComponent };
