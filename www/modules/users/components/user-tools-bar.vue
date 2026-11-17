<script>
import UserCreate from "./user-create.vue";
import { userListStore } from "../../../stores/user-list.store.js";
export default {
	components: { UserCreate },
	data: () => ({ userListStore }),
};
</script>

<template>
	<div class="user-tools-bar tools-bar">
		<search class="tools-bar-flex1" :store-list="userListStore" />
		<user-create />
	</div>
</template>
