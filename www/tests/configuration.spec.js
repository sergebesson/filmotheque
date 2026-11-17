import { test, expect } from "@playwright/test";
import { configurationStore } from "../stores/configuration.store.js";

test("configuration : taille de page des listes importées avant et après son chargement", async () => {
	const originalFetch = globalThis.fetch;
	const originalDocument = globalThis.document;
	const requests = [];
	globalThis.document = { baseURI: "http://filmotheque.test/" };
	globalThis.fetch = async (url) => {
		requests.push(url);
		return new Response(JSON.stringify(url.pathname === "/configuration" ? { pageSize: 7 } : {
			page: 1, total_pages: 2, movies: [], users: [],
		}), { headers: { "content-type": "application/json" } });
	};
	try {
		const { movieListStore: earlyMovies } = await import("../stores/movie-list.store.js?early");
		const { userListStore: earlyUsers } = await import("../stores/user-list.store.js?early");
		expect([earlyMovies.configuration.pageSize, earlyUsers.configuration.pageSize]).toEqual([30, 30]);
		await configurationStore.load();
		const { movieListStore: lateMovies } = await import("../stores/movie-list.store.js?late");
		const { userListStore: lateUsers } = await import("../stores/user-list.store.js?late");
		for (const store of [earlyMovies, earlyUsers, lateMovies, lateUsers]) {
			expect(store.configuration.pageSize).toBe(7);
		}
		await Promise.all([
			earlyMovies.getMovies(), earlyUsers.getUsers(), lateMovies.getMovies(), lateUsers.getUsers(),
		]);
		expect(requests.filter(url => url.pathname.startsWith("/api/"))
			.map(url => [url.pathname, url.searchParams.get("page_size")]).sort()).toEqual([
			["/api/movies", "7"], ["/api/movies", "7"], ["/api/users", "7"], ["/api/users", "7"],
		]);
	} finally {
		globalThis.fetch = originalFetch;
		if (originalDocument === undefined) { delete globalThis.document; }
		else { globalThis.document = originalDocument; }
		configurationStore.state.configuration = {};
	}
});
