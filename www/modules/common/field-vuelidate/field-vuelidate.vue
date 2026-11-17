<script>
export default {
	/**
	 * Champ Vuelidate transmis tel quel au slot : le contrôle écrit dans field.$model.
	 * field.$dirty pilote la classe dirty et le gras du champ ; aucune règle définie ici.
	 */
	props: { field: { type: Object, required: true } },
};
</script>

<template>
	<div class="field-vuelidate" :class="{ dirty: field.$dirty }"><slot :field="field" /></div>
</template>
