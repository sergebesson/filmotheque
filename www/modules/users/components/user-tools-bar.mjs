
import { userListStore } from "../../../stores/user-list.store.mjs";

const userToolsBarComponent = {
	data: () => ({
		userListStore,
	}),
	template: `
		<div class="user-tools-bar">
			<search :store-list="userListStore" />
			<user-create />
		</div>
	`,
};

export { userToolsBarComponent };
