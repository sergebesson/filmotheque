<script>
export default { data: () => ({ show: false }) };
</script>

<template>
	<nav class="navigation">
		<v-btn icon aria-label="Menu" @click="show = true"><v-icon>menu</v-icon></v-btn>
		<v-navigation-drawer v-model="show" temporary width="300">
			<v-toolbar color="transparent" class="text-primary" title="Menu" />
			<v-list base-color="primary" color="var(--filmotheque-text-light)" @click="show = false">
				<v-list-item :to="{ name: 'movies' }" title="liste des films" />
				<v-list-item :to="{ name: 'users' }" title="gestion des utilisateurs" />
			</v-list>
		</v-navigation-drawer>
	</nav>
</template>

<style>
/* Titres générés : pas de prop de taille/approche équivalente. Garder l'overlay à zéro
 * seulement sur la route active ; variant="plain" atténuerait aussi les liens inactifs
 * et supprimerait leur retour visuel au focus/survol. */
.navigation .v-list-item-title { font-size: 14px; letter-spacing: .01em; }
.navigation .v-list-item--active > .v-list-item__overlay { opacity: 0; }
</style>
