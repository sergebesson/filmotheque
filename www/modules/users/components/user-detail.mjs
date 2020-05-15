/* global vuelidate _ */

import { User } from "../services/user.service.mjs";

const debounceTimeCreateName = 1000;

const userDetail = {
	events: [ "error", "exit", "dirty", "updated" ],
	mixins: [ vuelidate.validationMixin ],
	props: {
		name: { type: String },
		createMode: { type: Boolean, default: false },
	},
	data: () => ({
		user: {},
		createName: "",
		sending: false,
		activateDeletionConfirmation: false,
	}),
	computed: {
		validCreateName: (vm) => !vm.createMode ||
			(!vm.$v.user.name.$pending && vm.createName === vm.$v.user.name.$model),
		updateDisabled: (vm) => !vm.$v.$anyDirty || vm.$v.$invalid ||
			vm.sending || vm.user.isDeleted || vm.$v.$pending || !vm.validCreateName,
		deleteDisabled: (vm) => vm.user.isAdmin || vm.sending || vm.user.isDeleted,
	},
	validations() {
		return { user: User.validations(this.createMode) };
	},
	watch: {
		name: "initialize",
		createdMode: "initialize",
		"$v.$anyDirty": function () {
			this.$emit("dirty", this.$v.$anyDirty);
		},
	},
	created: async function () {
		this.errorMessage = {
			name: {
				pending: "Vérification du nom en cours",
				required: "Le nom est obligatoire",
				notUserExists: "Le nom d'utilisateur existe déjà",
			},
			password: {
				required: "Le mot de passe est obligatoire",
				minLength: `Le mot de passe doit contenir au moins ${ this.$v.user.password.$params.minLength.min } caractères`,
			},
			description: {
				required: "La description est obligatoire",
			},
			sexe: {
				required: "Le genre est obligatoire",
				oneOf: `Le genre doit être parmi les valeurs suivantes: ${ this.$v.user.sexe.$params.oneOf.values.join(", ") }`,
			},
		};
		await this.initialize();
	},
	methods: {
		initialize: async function () {
			this.createName = "";
			this.user = new User();
			await this.$nextTick();
			this.$v.$reset();
			if (!this.createMode) {
				await this.getUser();
			}
		},
		getUser: async function () {
			this.sending = true;
			try {
				this.user = await User.getByName(this.name);
				await this.$nextTick();
				this.$v.$reset();
			} catch (error) {
				this.$emit("error", error);
			} finally {
				this.sending = false;
			}
		},
		saveUser: async function () {
			if (!this.$v.$invalid) {
				this.sending = true;
				try {
					await this.user[this.createMode ? "createUser" : "saveUser"]();
					this.$v.$reset();
					await this.$nextTick();
					this.$emit("updated", {
						type: this.createMode ? "created" : "updated",
						user: this.user,
					});
				} finally {
					this.sending = false;
				}
			}
		},
		deleteUser: async function () {
			this.sending = true;
			try {
				await this.user.deleteUser();
				this.$emit("updated", { type: "deleted", user: this.user });
			} finally {
				this.sending = false;
			}
		},
		inputName: _.debounce(function () {
			// eslint-disable-next-line no-invalid-this
			this.$v.user.name.$model = this.createName;
		}, debounceTimeCreateName),
	},
	template: `
		<md-card class="user-detail md-elevation-3">
			<form novalidate @submit.prevent="saveUser">
				<md-toolbar md-elevation="0" class="md-transparent">
					<field-vuelidate v-if="createMode" class="md-inline"
						label="Nom" :field="$v.user.name" v-slot="{ field }"
					>
						<md-input name="name" v-model.trim="createName" @input="inputName" autocomplete="new-password" />
						<span class="md-error" v-if="field.$pending">{{ errorMessage.name.pending }}</span>
						<span class="md-error" v-else-if="!field.notUserExists">{{ errorMessage.name.notUserExists }}</span>
						<span class="md-error" v-else>{{ errorMessage.name.required }}</span>
					</field-vuelidate>
					<transition v-else
						enter-active-class="animate__animated animate__flash"
						mode="out-in"
					>
						<div :class="[ 'md-title', { admin: user.isAdmin } ]" :key="name">
							{{ name }}
						</div>
					</transition>
					<md-button class="md-icon-button" type="submit" :disabled="updateDisabled">
						<md-icon>check</md-icon>
					</md-button>
					<md-button v-if="!createMode" class="md-icon-button" type="button" :disabled="deleteDisabled" @click="activateDeletionConfirmation = true">
						<md-icon>delete_outline</md-icon>
					</md-button>
					<md-button @click="$emit('exit')" class="md-icon-button" :disabled="sending || user.isDeleted">
						<md-icon>close</md-icon>
					</md-button>
				</md-toolbar>
				<spinner :animate="sending" />
				<fieldset :disabled="sending || user.isDeleted">
					<field-vuelidate :field="$v.user.active" v-slot="{ field }">
						<md-switch name="active" v-model="field.$model" class="md-primary" :disabled="sending || user.isDeleted || user.isAdmin">actif</md-switch>
					</field-vuelidate>
					<field-vuelidate label="Mot de passe" :field="$v.user.password" v-slot="{ field }">
						<md-input name="password" v-model.trim="field.$model" type="password" autocomplete="new-password"/>
						<span class="md-error" v-if="!field.required">{{ errorMessage.password.required }}</span>
						<span class="md-error" v-else>{{ errorMessage.password.minLength }}</span>
					</field-vuelidate>
					<field-vuelidate label="Pseudo" :field="$v.user.pseudo" v-slot="{ field }">
						<md-input name="pseudo" v-model.trim="field.$model" />
					</field-vuelidate>
					<field-vuelidate label="Description" :field="$v.user.description" v-slot="{ field }">
						<md-input name="description" v-model.trim="field.$model" />
						<span class="md-error">{{ errorMessage.description.required }}</span>
					</field-vuelidate>
					<field-vuelidate label="Genre" :field="$v.user.sexe" v-slot="{ field }">
						<md-select name="sexe" v-model.trim="field.$model">
							<md-option value="F">Femme</md-option>
							<md-option value="M">Homme</md-option>
						</md-select>
						<span class="md-error" v-if="!field.required">{{ errorMessage.sexe.required }}</span>
						<span class="md-error" v-else>{{ errorMessage.sexe.oneOf }}</span>
					</field-vuelidate>
				</fieldset>
			</form>
			<md-dialog-confirm
				:md-active.sync="activateDeletionConfirmation"
				md-title="Confirmer la suppression"
				:md-content="'Êtes vous sur de vouloir supprimer l\\'utilisateur <strong>' + user.name + '</strong> ?'"
				md-confirm-text="Oui"
				md-cancel-text="Non"
				@md-confirm="deleteUser"
			/>
		</md-card>
	`,
};

export { userDetail };
