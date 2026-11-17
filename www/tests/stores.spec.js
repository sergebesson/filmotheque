import { test, expect } from "@playwright/test";
import { movieListStore } from "../stores/movie-list.store.js";
import { userListStore } from "../stores/user-list.store.js";
import { eventBus, eventName } from "../eventBus.js";

for (const [store, field, first, second] of [
	[movieListStore, "movies", { _id: "17", title: "Été + mer" }, { _id: "3", title: "Suite" }],
	[userListStore, "users", { name: "élise" }, { name: "bruno" }],
]) {
	test(`${field} : recherche attendable, pagination et erreur consommée`, async () => {
		const originalFetch = globalThis.fetch;
		const originalDocument = globalThis.document;
		const requests = [];
		const errors = [];
		let respond;
		const onError = event => errors.push(event.message);
		eventBus.on(eventName.ERROR, onError);
		globalThis.document = { baseURI: "http://filmotheque.test/" };
		globalThis.fetch = url => {
			requests.push(url);
			return new Promise(resolve => { respond = resolve; });
		};
		const response = (page, items) => new Response(JSON.stringify({
			page, total_pages: 2, [field]: items,
		}), { headers: { "content-type": "application/json" } });
		try {
			const special = "été + & ? #";
			const search = store.setSearch(special);
			expect(store.state.search).toBe(special);
			expect(store.state.loading).toBe(true);
			expect(requests[0].pathname).toBe(`/api/${field}`);
			expect(requests[0].searchParams.get("search")).toBe(special);
			expect(requests[0].searchParams.get("page")).toBe("1");
			await store.nextPage();
			expect(requests).toHaveLength(1);
			respond(response(1, [first]));
			await search;
			expect(store.state[field]).toEqual([first]);
			expect(store.state.loading).toBe(false);
			const next = store.nextPage();
			expect(requests[1].searchParams.get("page")).toBe("2");
			expect(requests[1].searchParams.get("search")).toBe(special);
			respond(response(2, [second]));
			await next;
			expect(store.state[field]).toEqual([first, second]);
			expect(store.state.page).toBe(2);
			await store.nextPage();
			expect(requests).toHaveLength(2);
			const clear = store.setSearch("");
			expect(requests[2].searchParams.has("search")).toBe(false);
			expect(requests[2].searchParams.get("page")).toBe("1");
			respond(response(1, []));
			await clear;
			expect(store.state[field]).toEqual([]);
			expect(store.state.page).toBe(1);
			expect(store.state.search).toBe("");
			const failure = store.setSearch("échec");
			respond(new Response("Indisponible", { status: 503 }));
			await expect(failure).resolves.toBeUndefined();
			expect(store.state.loading).toBe(false);
			expect(errors).toEqual([field === "movies" ?
				"Impossible de récupérer la liste des films" : "Impossible de récupérer la liste des utilisateurs"]);
			if (field === "users") {
				const recovery = store.setSearch(special);
				respond(response(1, [first]));
				await recovery;
				const refresh = store.update();
				expect(store.state.updating).toBe(true);
				expect(store.state.loading).toBe(false);
				respond(new Response('{"error_description":"Refus"}', {
					status: 403, headers: { "content-type": "application/json" },
				}));
				await expect(refresh).rejects.toMatchObject({ response: { status: 403, data: { error_description: "Refus" } } });
				expect(store.state.updating).toBe(false);
				expect(store.state.users).toEqual([first]);
				expect(store.state.search).toBe(special);
				expect(errors).toEqual(["Impossible de récupérer la liste des utilisateurs"]);
			}
		} finally {
			eventBus.off(eventName.ERROR, onError);
			globalThis.fetch = originalFetch;
			if (originalDocument === undefined) { delete globalThis.document; }
			else { globalThis.document = originalDocument; }
		}
	});
}
