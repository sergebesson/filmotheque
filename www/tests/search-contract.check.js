// @ts-check
// Contrôle statique seulement : ni scénario Playwright ni module de l'application.
import { movieListStore } from "../stores/movie-list.store.js";

/** @type {import("../stores/movie-list.store.js").SearchList} */
const producer = movieListStore;
/** @type {(search: string) => Promise<void>} */
const action = producer.setSearch;

export { producer, action };
