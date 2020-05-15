
const navigationComponent = {
	data: () => ({
		show: false,
	}),
	template: `
		<div class="navigation">
			<md-button class="md-icon-button" @click="show = true">
				<md-icon>menu</md-icon>
			</md-button>
			<md-drawer :md-active.sync="show" md-swipeable>
				<div @click="show=false">
					<md-toolbar class="md-transparent" md-elevation="0">
						<span class="md-title">Menu</span>
					</md-toolbar>
					<md-list>
						<md-list-item :to="{ name: 'movies' }">liste des films</md-list-item>
						<md-list-item :to="{ name: 'users' }">gestion des utilisateurs</md-list-item>
					</md-list>
				</div>
			</md-drawer>
		</div>
	`,
};

export { navigationComponent };
