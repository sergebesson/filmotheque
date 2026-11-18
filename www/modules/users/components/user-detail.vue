<script>
import debounce from "lodash/debounce.js";
import { useVuelidate } from "@vuelidate/core";
import * as validators from "@vuelidate/validators";
import { VSelect, VSwitch } from "vuetify/components";
import FieldVuelidate from "../../common/field-vuelidate/field-vuelidate.vue";
import { oneOf } from "../../../common/vuelidate-validator.js";
import { User } from "../services/user.service.js";
import { eventBus, eventName } from "../../../eventBus.js";

const debounceTimeCreateName = 1000;

export default {
	components: { FieldVuelidate, VSelect, VSwitch },
	props: {
		name: { type: String, default: "" },
		createMode: { type: Boolean, default: false },
	},
	/**
	 * updated: { type: 'created'|'updated'|'deleted', user: User }, après mutation réussie.
	 * L'émission n'attend pas le rafraîchissement du parent et ne prolonge pas sending.
	 * dirty: boolean ; exit: sans payload ; error: erreur de chargement déjà présentée,
	 * utilisée par le parent uniquement pour sortir du détail, pas pour afficher à nouveau.
	 */
	emits: ["error", "exit", "dirty", "updated"],
	setup() { return { v$: useVuelidate() }; },
	data: () => ({
		user: new User(), createName: "", passwordVisible: false,
		sending: false, activateDeletionConfirmation: false,
	}),
	computed: {
		validCreateName() {
			return !this.createMode || (!this.v$.user.name.$pending && this.createName === this.v$.user.name.$model);
		},
		updateDisabled() {
			return !this.v$.$anyDirty || this.v$.$invalid || this.sending || this.user.isDeleted || this.v$.$pending || !this.validCreateName;
		},
		deleteDisabled() { return this.user.isAdmin || this.sending || this.user.isDeleted; },
		errorMessage() {
			return {
				name: { required: "Le nom est obligatoire", notUserExists: "Le nom d'utilisateur existe déjà" },
				password: {
					required: "Le mot de passe est obligatoire",
					minLength: `Le mot de passe doit contenir au moins ${this.v$.user.password.minLength.$params.min} caractères`,
				},
				description: { required: "La description est obligatoire" },
				sexe: { required: "Le genre est obligatoire", oneOf: "Le genre doit être parmi les valeurs suivantes: F, M" },
			};
		},
	},
	validations() {
		const user = {
			name: { required: validators.required },
			active: {},
			password: { required: validators.required, minLength: validators.minLength(4) },
			pseudo: {},
			description: { required: validators.required },
			sexe: { required: validators.required, oneOf: oneOf([ "F", "M" ]) },
		};
		if (this.createMode) {
			user.name.notUserExists = validators.helpers.withAsync(async(name) => {
				if (name === "") {
					return true;
				}
				try {
					return !await User.userExists(name);
				} catch (error) {
					eventBus.emit(eventName.ERROR, { message: `Impossible de savoir si l'utilisateur '${ name }' existe`, error });
					// Le validateur présente l'erreur ; Vuelidate consomme son rejet.
					throw error;
				}
			});
		}
		return { user };
	},
	watch: {
		"v$.$anyDirty"(dirty) { this.$emit("dirty", dirty); },
	},
	async created() {
		this.inputName = debounce(() => { this.v$.user.name.$model = this.createName; }, debounceTimeCreateName);
		if (!this.createMode) { await this.getUser(); }
	},
	beforeUnmount() { this.inputName.cancel(); },
	methods: {
		fieldErrors(name) {
			return this.v$.user[name].$errors.map((error) => this.errorMessage[name][error.$validator]);
		},
		async getUser() {
			this.sending = true;
			try {
				this.user = await User.getByName(this.name);
				await this.$nextTick();
				this.v$.$reset();
			} catch (error) {
				eventBus.emit(eventName.ERROR, { message: `Impossible de récupérer l'utilisateur ${ this.name }`, error });
				// Événement de sortie du détail, pas une seconde présentation de l'erreur.
				this.$emit("error", error);
			} finally { this.sending = false; }
		},
		async saveUser() {
			if (this.updateDisabled || !await this.v$.$validate()) { return; }
			this.sending = true;
			try {
				await this.user[this.createMode ? "createUser" : "saveUser"]();
				this.v$.$reset();
				await this.$nextTick();
				// Le parent possède le rafraîchissement ; l'événement ne prolonge pas sending.
				this.$emit("updated", { type: this.createMode ? "created" : "updated", user: this.user });
			} catch (error) {
				eventBus.emit(eventName.ERROR, {
					message: this.createMode ? `Impossible de créer l'utilisateur ${ this.user.name }` : `Impossible de sauver l'utilisateur ${ this.user.name }`, error,
				});
			} finally { this.sending = false; }
		},
		async deleteUser() {
			this.activateDeletionConfirmation = false;
			this.sending = true;
			try {
				await this.user.deleteUser();
				this.v$.$reset();
				await this.$nextTick();
				this.$emit("updated", { type: "deleted", user: this.user });
			} catch (error) {
				eventBus.emit(eventName.ERROR, { message: `Impossible de supprimer l'utilisateur ${ this.user.name }`, error });
			} finally { this.sending = false; }
		},
	},
};
</script>

<template>
	<v-card class="user-detail elevation-3">
		<form novalidate @submit.prevent="saveUser">
			<div class="detail-toolbar">
				<field-vuelidate v-if="createMode" v-slot="{ field }" :field="v$.user.name" class="detail-title">
					<v-text-field
						v-model.trim="createName" name="name" label="Nom *" required autocomplete="new-password"
						:disabled="sending" :error-messages="fieldErrors('name')"
						:messages="field.$pending ? 'Vérification du nom en cours' : []" @update:model-value="inputName"
					/>
				</field-vuelidate>
				<div v-else class="detail-title" :class="{ admin: user.isAdmin }">{{ name }}</div>
				<v-btn icon type="submit" aria-label="Enregistrer" :disabled="updateDisabled"><v-icon>check</v-icon></v-btn>
				<v-btn v-if="!createMode" icon type="button" aria-label="Supprimer" :disabled="deleteDisabled" @click="activateDeletionConfirmation = true"><v-icon>delete_outline</v-icon></v-btn>
				<v-btn icon type="button" aria-label="Fermer" :disabled="sending || user.isDeleted" @click="$emit('exit')"><v-icon>close</v-icon></v-btn>
			</div>
			<spinner :animate="sending" />
			<fieldset :disabled="sending || user.isDeleted">
				<field-vuelidate v-slot="{ field }" :field="v$.user.active">
					<v-switch v-model="field.$model" name="active" label="actif" color="primary" hide-details :disabled="sending || user.isDeleted || user.isAdmin" />
				</field-vuelidate>
				<field-vuelidate v-slot="{ field }" :field="v$.user.password">
					<v-text-field v-model.trim="field.$model" label="Mot de passe *" required name="password" :type="passwordVisible ? 'text' : 'password'" autocomplete="new-password" :error-messages="fieldErrors('password')" :disabled="sending || user.isDeleted">
						<template #append-inner>
							<v-btn
								:icon="passwordVisible ? 'visibility_off' : 'visibility'" density="compact" type="button"
								:aria-label="passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" :aria-pressed="passwordVisible"
								:disabled="sending || user.isDeleted" @click="passwordVisible = !passwordVisible"
							/>
						</template>
					</v-text-field>
				</field-vuelidate>
				<field-vuelidate v-slot="{ field }" :field="v$.user.pseudo">
					<v-text-field v-model.trim="field.$model" label="Pseudo" name="pseudo" :disabled="sending || user.isDeleted" />
				</field-vuelidate>
				<field-vuelidate v-slot="{ field }" :field="v$.user.description">
					<v-text-field v-model.trim="field.$model" label="Description *" required name="description" :error-messages="fieldErrors('description')" :disabled="sending || user.isDeleted" />
				</field-vuelidate>
				<field-vuelidate v-slot="{ field }" :field="v$.user.sexe">
					<v-select v-model="field.$model" label="Genre *" required aria-required="true" name="sexe" :items="[{ title: 'Femme', value: 'F' }, { title: 'Homme', value: 'M' }]" :error-messages="fieldErrors('sexe')" :disabled="sending || user.isDeleted" />
				</field-vuelidate>
			</fieldset>
			<p class="required-note">* obligatoire</p>
		</form>
		<v-dialog v-model="activateDeletionConfirmation" max-width="500" aria-label="Confirmer la suppression">
			<v-card title="Confirmer la suppression">
				<v-card-text>Êtes vous sûr de vouloir supprimer l'utilisateur <strong>{{ user.name }}</strong> ?</v-card-text>
				<v-card-actions>
					<v-spacer /><v-btn @click="activateDeletionConfirmation = false">Non</v-btn><v-btn @click="deleteUser">Oui</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-card>
</template>

<style>
.user-detail { flex: 0 0 400px; max-width: 400px; margin: 5px 5px 0; border-radius: 8px 8px 0 0; color: var(--filmotheque-primary); }
.user-detail form { display: flex; flex-direction: column; height: 100%; }
.user-detail .detail-toolbar { display: flex; align-items: center; padding: 8px; min-height: 64px; }
.user-detail .detail-title { flex: 1; min-width: 0; font-size: 20px; overflow: hidden; text-overflow: ellipsis; }
.user-detail .detail-title.field-vuelidate { overflow: visible; padding-top: 12px; }
/* Le champ de création doit rétrécir dans la toolbar ; color ne règle que l'accent
 * Vuetify, pas le texte noir. dirty concerne aussi le label flottant généré. */
.user-detail .detail-title .v-input { min-width: 120px; }
.user-detail .v-input { color: #000; }
.user-detail .dirty input, .user-detail .dirty .v-label { font-weight: bold; }
.user-detail fieldset { border: none; margin: 0 15px; padding: 0; overflow-y: auto; }
.user-detail .spinner { min-height: 10px; }
.user-detail .required-note { margin: 0 15px 12px; font-size: 12px; color: var(--filmotheque-text-muted); }
@media (max-width: 600px) { .user-detail { flex: 1; max-width: calc(100% - 10px); } }
</style>
