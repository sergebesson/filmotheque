import { test as base, expect } from "@playwright/test";

const test = base.extend({
	lastVersion: ["999.0.0", { option: true }],
	usersToCleanUp: async ({ request }, use) => {
		const names = [];
		// Le teardown garde request ouvert et dispose d'un budget après un timeout du test.
		await use(names);
		for (const name of names) {
			const url = `/api/users/${encodeURIComponent(name)}`;
			const status = (await request.head(url)).status();
			expect.soft([204, 404], `Nettoyage de ${name}`).toContain(status);
			if (status === 204) { expect.soft((await request.delete(url)).status()).toBe(204); }
		}
	},
	browserErrors: [async ({ context }, use) => {
		const errors = [];
		// Le contexte observe aussi les nouvelles pages, avant leur premier script.
		const onError = webError => errors.push({
			url: webError.page()?.url(), error: webError.error().stack || webError.error().message,
		});
		context.on("weberror", onError);
		try { await use(); }
		finally {
			context.off("weberror", onError);
			// Les erreurs HTTP traitées n'autorisent aucune exception JavaScript non interceptée.
			expect(errors, "Exceptions JavaScript non interceptées dans le navigateur").toEqual([]);
		}
	}, { auto: true }],
});

test.beforeEach(async ({ page, lastVersion }) => {
	await page.addInitScript(version => {
		// Initialiser seulement la première visite pour conserver la persistance au rechargement.
		if (version !== null && localStorage.getItem("last_version") === null) {
			localStorage.setItem("last_version", version);
		}
	}, lastVersion);
});

test.afterEach(async ({ page }) => {
	await expect(page.getByRole("dialog", { name: "ERREUR", exact: true })).toHaveCount(0);
});

for (const scenario of [
	{ previous: "1.9.0", version: "1.10.0", opens: true },
	{ previous: "1.10.0", version: "1.9.0", opens: false },
	{ previous: "2.0.0", version: "10.0.0", opens: true },
	{ previous: "10.0.0", version: "2.0.0", opens: false },
	{ previous: "1.99.0", version: "2.0.0", opens: true },
	{ previous: "1.4.14", version: "1.4.14", opens: false },
	{ previous: "1.4.14", version: "1.4.15", opens: false },
	{ previous: null, version: "1.4.14", opens: true },
	{ previous: "1.9.0", version: "1.10.0", opens: false, flash: "" },
]) {
	test.describe(`flash : ${scenario.previous ?? "première visite"} vers ${scenario.version}${scenario.flash === "" ? " sans contenu" : ""}`, () => {
		test.use({ lastVersion: scenario.previous });
		test("ouverture automatique selon major/minor et persistance", async ({ page }) => {
			await page.route("**/api/infos", route => route.fulfill({ json: {
				version: scenario.version, number_of_movies: 24, flash: scenario.flash ?? "<p>Annonce de test</p>",
			} }));
			await page.goto("/#/movies");
			// Le titre est appliqué après réception des informations, même si la version est inchangée.
			await expect(page).toHaveTitle(`filmothèque ${scenario.version} - 24 films`);
			await expect.poll(() => page.evaluate(() => localStorage.getItem("last_version"))).toBe(scenario.version);
			const flash = page.getByRole("dialog", { name: `Filmotheque version: ${scenario.version}`, exact: true });
			if (scenario.opens) {
				await expect(flash).toBeVisible();
				await expect(flash).toContainText("Annonce de test");
			} else {
				await expect(flash).toHaveCount(0);
			}
		});
	});
}

test.describe("flash : fermeture et consultation ultérieure", () => {
	test.use({ lastVersion: "1.9.0" });
	test("pas de réouverture au rechargement, ouverture manuelle possible", async ({ page }) => {
		await page.route("**/api/infos", route => route.fulfill({ json: {
			version: "1.10.0", number_of_movies: 24, flash: "<p>Annonce de test</p>",
		} }));
		await page.goto("/#/movies");
		const flash = page.getByRole("dialog", { name: "Filmotheque version: 1.10.0", exact: true });
		await expect(flash).toBeVisible();
		await flash.getByRole("button", { name: "OK", exact: true }).click();
		await expect(flash).not.toBeVisible();
		await page.reload();
		await expect(page).toHaveTitle("filmothèque 1.10.0 - 24 films");
		await expect.poll(() => page.evaluate(() => localStorage.getItem("last_version"))).toBe("1.10.0");
		await expect(flash).toHaveCount(0);
		await page.getByRole("button", { name: "Profil", exact: true }).click();
		await page.getByText("à propos", { exact: true }).click();
		await expect(flash).toBeVisible();
		await expect(flash).toContainText("Annonce de test");
	});
});

test("films : pagination, recherche, chargement complet et téléchargement", async ({ page }, testInfo) => {
	await page.goto("/");
	await expect(page.getByText("Film de test 01", { exact: true })).toBeVisible();
	await expect(page.locator(".movie-list-item")).toHaveCount(3);
	await expect(page.getByText("17 mars 2026", { exact: true })).toBeVisible();
	await expect(page.getByText("Film de test 01.avi - 1.00 Mio", { exact: true })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("movies.png"), animations: "disabled" });
	const viewport = page.viewportSize();
	await page.setViewportSize({ ...viewport, height: 240 });
	await page.locator(".infinite-list").evaluate((list) => { list.scrollTop = list.scrollHeight; });
	await expect(page.locator(".movie-list-item")).toHaveCount(6);
	await page.setViewportSize(viewport);
	await page.getByRole("textbox", { name: "Rechercher...", exact: true }).fill("Film de test 17");
	await expect(page.locator(".movie-list-item")).toHaveCount(1);
	await expect(page.getByText("Film de test 17", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Vider Rechercher...", exact: true }).click();
	await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toHaveValue("");
	await expect(page.locator(".movie-list-item")).toHaveCount(3);
	await page.getByRole("textbox", { name: "Rechercher...", exact: true }).fill("Introuvable");
	await expect(page.getByText("Aucun film", { exact: true })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("empty.png"), animations: "disabled" });
	await page.getByRole("button", { name: "Tout charger", exact: true }).click();
	await expect(page.locator(".movie-list-item")).toHaveCount(24);
	await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toHaveValue("");
	const downloadPromise = page.waitForEvent("download");
	await page.getByText("Film de test 01", { exact: true }).click();
	expect((await downloadPromise).suggestedFilename()).toBe("Film de test 01.avi");
});

test("administration : scripts et styles différés, configuration et historique", async ({ page }) => {
	const assets = new Set();
	const usersRequests = [];
	page.on("request", request => {
		const url = new URL(request.url());
		if (/^\/assets\/.*\.(js|css)$/.test(url.pathname)) { assets.add(url.pathname); }
		if (url.pathname === "/api/users") { usersRequests.push(url); }
	});
	await page.goto("/#/movies");
	await expect(page.locator(".movie-list-item")).toHaveCount(3);
	await page.waitForLoadState("networkidle");
	const initialAssets = new Set(assets);
	const styles = [];
	await page.route("**/assets/*.css", route => { styles.push(route); });
	await page.getByRole("button", { name: "Menu", exact: true }).click();
	await page.getByRole("link", { name: "gestion des utilisateurs", exact: true }).click();
	// Une feuille créée mais préchargée dès les films ne satisferait pas ce contrat.
	await expect.poll(() => styles.length).toBeGreaterThan(0);
	await expect(page.locator(".users")).toHaveCount(0);
	expect(usersRequests).toHaveLength(0);
	await Promise.all(styles.map(route => route.continue()));
	await page.unroute("**/assets/*.css");
	await expect(page).toHaveURL(/\/users\/list$/);
	await expect(page.locator(".user-list [role=listitem]")).toHaveCount(3);
	expect(usersRequests[0].searchParams.get("page_size")).toBe("3");
	expect([...assets].some(file => file.endsWith(".js") && !initialAssets.has(file))).toBe(true);
	expect([...assets].some(file => file.endsWith(".css") && !initialAssets.has(file))).toBe(true);
	await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toBeFocused();
	await page.goBack();
	await expect(page.locator(".movie-list-item")).toHaveCount(3);
	const loadedAssets = [...assets].sort();
	await page.goForward();
	await expect(page.locator(".user-list [role=listitem]")).toHaveCount(3);
	expect([...assets].sort()).toEqual(loadedAssets);
});

for (const timezoneId of ["UTC", "Europe/Paris", "America/Los_Angeles", "Pacific/Auckland"]) {
	test.describe(`dates des films en ${timezoneId}`, () => {
		test.use({ timezoneId });
		test("dates sans heure françaises et regroupements", async ({ page }) => {
			const dates = ["2026-03-29", "2024-02-29", "2026-03-29", "2026-11-01", "2025-12-06"];
			await page.route("**/api/movies?**", route => route.fulfill({ json: {
				page: 1, total_pages: 1,
				movies: dates.map((date_added, index) => ({
					_id: String(index), title: `Date ${index}`, file_name: `Date ${index}.avi`, date_added, size: 1048576,
				})),
			} }));
			await page.goto("/#/movies");
			await expect(page.locator(".movie-list-item")).toHaveCount(5);
			await expect(page.locator(".movie-list .list-subheader")).toHaveText([
				"29 mars 2026", "29 février 2024", "1 novembre 2026", "6 décembre 2025",
			]);
			const march = page.getByText("29 mars 2026", { exact: true }).locator("..");
			await expect(march.getByRole("listitem")).toHaveCount(2);
			await expect(march).toContainText("Date 0");
			await expect(march).toContainText("Date 2");
		});
	});
}

for (const list of [
	{ route: "/movies", api: "movies", first: "Film de test 01", empty: "Aucun film", link: "liste des films", otherLink: "gestion des utilisateurs", otherFirst: "alice" },
	{ route: "/users/list", api: "users", first: "alice", empty: "Aucun utilisateur", link: "gestion des utilisateurs", otherLink: "liste des films", otherFirst: "Film de test 01" },
]) {
	test(`${list.api} : délai, caractères spéciaux, indicateurs et annulation à la navigation`, async ({ page }) => {
		await page.goto(`/#${list.route}`);
		await expect(page.getByRole("listitem").getByText(list.first, { exact: true })).toBeVisible();
		await page.clock.install();
		await page.clock.pauseAt(new Date(Date.now() + 100));
		const requests = [];
		await page.route(`**/api/${list.api}?**`, route => { requests.push(route); });
		const search = page.getByRole("textbox", { name: "Rechercher...", exact: true });
		const special = "été + & ? # introuvable";
		await search.fill(special);
		await page.clock.fastForward(999);
		expect(requests).toHaveLength(0);
		await page.clock.fastForward(1);
		await expect.poll(() => requests.length).toBe(1);
		const url = new URL(requests[0].request().url());
		expect(url.searchParams.get("search")).toBe(special);
		expect(url.searchParams.get("page")).toBe("1");
		expect(url.searchParams.get("page_size")).toBe("3");
		await expect(search).toBeEnabled();
		await expect(page.locator(".search .spinner")).toHaveClass(/animated/);
		await expect(page.locator(".infinite-list .spinner")).toHaveClass(/animated/);
		await requests[0].continue();
		await expect(page.getByText(list.empty, { exact: true })).toBeVisible();
		await expect(page.locator(".search .spinner")).not.toHaveClass(/animated/);
		await page.getByRole("button", { name: "Vider Rechercher...", exact: true }).click();
		await page.clock.fastForward(999);
		expect(requests).toHaveLength(1);
		await page.clock.fastForward(1);
		await expect.poll(() => requests.length).toBe(2);
		expect(new URL(requests[1].request().url()).searchParams.has("search")).toBe(false);
		await requests[1].continue();
		await expect(search).toHaveValue("");
		await expect(page.getByRole("listitem").getByText(list.first, { exact: true })).toBeVisible();
		await search.fill("recherche abandonnée");
		await page.clock.fastForward(100);
		await page.clock.resume();
		await page.getByRole("link", { name: list.otherLink, exact: true }).evaluate(link => link.click());
		await expect(page.getByRole("listitem").getByText(list.otherFirst, { exact: true })).toBeVisible();
		await page.clock.runFor(1100);
		expect(requests).toHaveLength(2);
		await page.getByRole("link", { name: list.link, exact: true }).evaluate(link => link.click());
		await expect(search).toHaveValue("");
		await expect(page.getByRole("listitem").getByText(list.first, { exact: true })).toBeVisible();
		await page.clock.runFor(1100);
		expect(requests).toHaveLength(2);
	});
}

test("films : fondu du fond au survol et au retrait", async ({ page }, testInfo) => {
	await page.goto("/");
	const movie = page.locator(".movie-list-item").first();
	await expect(movie).toBeVisible();
	await page.mouse.move(0, 0);
	await expect(movie).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
	for (const hovered of [true, false]) {
		if (hovered) { await movie.hover({ position: { x: 30, y: 15 } }); }
		else { await page.mouse.move(0, 0); }
		const transition = await movie.evaluate((element) => {
			const animation = element.getAnimations().find((item) => item.transitionProperty === "background-color");
			if (!animation) { return null; }
			animation.pause();
			animation.currentTime = 250;
			const result = {
				duration: animation.effect.getTiming().duration,
				color: getComputedStyle(element).backgroundColor,
			};
			animation.finish();
			return result;
		});
		expect(transition).not.toBeNull();
		expect(transition.duration).toBe(500);
		const alpha = Number(transition.color.match(/[\d.]+/g).at(-1));
		expect(alpha).toBeGreaterThan(0);
		expect(alpha).toBeLessThan(0.2);
		await expect(movie).toHaveCSS("background-color", hovered ? "rgba(139, 69, 19, 0.2)" : "rgba(0, 0, 0, 0)");
		await page.screenshot({ path: testInfo.outputPath(hovered ? "hover.png" : "rest.png"), animations: "disabled" });
	}
});

test("utilisateurs : en-têtes alignés avec les données et le défilement", async ({ page }, testInfo) => {
	await page.goto("/#/users/list");
	await expect(page.getByRole("listitem").getByText("alice", { exact: true })).toBeVisible();
	async function expectAlignedColumns() {
		await expect.poll(() => page.locator(".user-list").evaluate((list) => {
			const headers = [...list.querySelector(".list-subheader").children];
			const offsets = [...list.querySelectorAll("[role=listitem] .user-row")].flatMap((row) => headers.flatMap((header, index) => {
				if (index === 0 || getComputedStyle(header).display === "none") { return []; }
				const heading = document.createRange();
				heading.selectNodeContents(header);
				const data = document.createRange();
				data.selectNodeContents(row.children[index]);
				return [Math.abs(heading.getBoundingClientRect().x - data.getBoundingClientRect().x)];
			}));
			return Math.max(...offsets);
		})).toBeLessThan(1);
	}
	await expectAlignedColumns();
	await page.screenshot({ path: testInfo.outputPath("users-aligned.png"), animations: "disabled" });
	const viewport = page.viewportSize();
	await page.setViewportSize({ ...viewport, height: 230 });
	await expect.poll(() => page.locator(".user-list .infinite-list").evaluate((list) => list.scrollHeight > list.clientHeight)).toBe(true);
	await expectAlignedColumns();
	await page.screenshot({ path: testInfo.outputPath("users-scroll.png"), animations: "disabled" });
	await page.setViewportSize(viewport);
	if (viewport.width > 600) {
		await page.getByRole("listitem").getByText("alice", { exact: true }).click();
		await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Alice");
		await expectAlignedColumns();
		await page.screenshot({ path: testInfo.outputPath("users-detail.png"), animations: "disabled" });
		await page.setViewportSize({ ...viewport, width: 800 });
		await expectAlignedColumns();
		await page.screenshot({ path: testInfo.outputPath("users-tablet-detail.png"), animations: "disabled" });
	}
});

test("utilisateurs : validation, création, modification et suppression", async ({ page, request, usersToCleanUp }, testInfo) => {
	const requiredLabels = ["Nom *", "Mot de passe *", "Description *", "Genre *"];
	await page.goto("/#/users/list");
	await expect(page.getByRole("listitem").getByText("alice", { exact: true })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("users.png"), animations: "disabled" });
	await page.getByRole("link", { name: "Créer un utilisateur" }).click();
	await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
	for (const label of requiredLabels) {
		await expect(page.getByLabel(label, { exact: true })).toHaveJSProperty("required", true);
		await expect(page.getByLabel(label, { exact: true })).toHaveCSS("color", "rgb(0, 0, 0)");
	}
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveJSProperty("required", false);
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCSS("color", "rgb(0, 0, 0)");
	await expect(page.getByText("* obligatoire", { exact: true })).toBeInViewport();
	await expect(page.getByText("* obligatoire", { exact: true })).toHaveCSS("color", "rgba(0, 0, 0, 0.6)");
	const password = page.getByLabel("Mot de passe *", { exact: true });
	await expect(password).toHaveAttribute("type", "password");
	await page.screenshot({ path: testInfo.outputPath("create.png"), animations: "disabled" });
	await page.getByRole("textbox", { name: "Nom *", exact: true }).fill("alice");
	await expect(page.getByText("Le nom d'utilisateur existe déjà", { exact: true })).toBeVisible();
	await password.fill("abc");
	await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
	await expect(password).toHaveAttribute("type", "text");
	await expect(password).toHaveValue("abc");
	await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).press("Enter");
	await expect(password).toHaveAttribute("type", "password");
	await expect(password).toHaveValue("abc");
	await expect(page.getByText("Le mot de passe doit contenir au moins 4 caractères")).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("validation.png"), animations: "disabled" });
	const name = `nouveau-${testInfo.project.name}`;
	usersToCleanUp.push(name);
	await page.getByRole("textbox", { name: "Nom *", exact: true }).fill(name);
	await password.fill("abcd");
	await page.getByLabel("Pseudo", { exact: true }).fill("Nouveau");
	await page.getByLabel("Description *", { exact: true }).fill("Compte temporaire");
	await page.getByRole("combobox", { name: "Genre *", exact: true }).press("ArrowDown");
	await page.getByRole("option", { name: "Femme" }).click();
	await expect(page.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
	await page.getByRole("button", { name: "Enregistrer" }).click();
	await expect(page).toHaveURL(new RegExp(`/users/edit/${name}$`));
	await expect(page.locator(".v-snackbar")).toContainText(`L'utilisateur '${name}' a été créé`);
	await expect(page.getByRole("textbox", { name: "Nom *", exact: true })).toHaveCount(0);
	for (const label of requiredLabels.slice(1)) {
		await expect(page.getByLabel(label, { exact: true })).toHaveJSProperty("required", true);
		await expect(page.getByLabel(label, { exact: true })).toHaveCSS("color", "rgb(0, 0, 0)");
	}
	await expect(page.getByText("* obligatoire", { exact: true })).toBeInViewport();
	await expect(page.getByLabel("Description *", { exact: true })).toHaveValue("Compte temporaire");
	await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
	await expect(password).toHaveAttribute("type", "password");
	await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
	await expect(password).toHaveAttribute("type", "text");
	await expect(password).toHaveValue("abcd");
	await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
	await page.screenshot({ path: testInfo.outputPath("password-visible.png"), animations: "disabled" });
	await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
	await expect(password).toHaveAttribute("type", "password");
	await expect(password).toHaveValue("abcd");
	await page.getByText("* obligatoire", { exact: true }).click();
	await page.screenshot({ path: testInfo.outputPath("edit.png"), animations: "disabled" });
	await page.getByLabel("Description *", { exact: true }).fill("Description modifiée");
	await page.getByRole("button", { name: "Enregistrer" }).click();
	await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
	expect((await (await request.get(`/api/users/${name}`)).json()).description).toBe("Description modifiée");
	await expect(page.locator(".v-snackbar")).toContainText(`L'utilisateur '${name}' a été mis à jour`);
	await page.getByRole("button", { name: "Supprimer", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Confirmer la suppression" })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("delete-confirm.png"), animations: "disabled" });
	await page.getByRole("button", { name: "Non", exact: true }).click();
	expect((await request.head(`/api/users/${name}`)).status()).toBe(204);
	await page.getByRole("button", { name: "Supprimer", exact: true }).click();
	await page.getByRole("button", { name: "Oui", exact: true }).click();
	await expect(page).toHaveURL(/\/users\/list$/);
	await expect(page.locator(".v-snackbar")).toContainText(`L'utilisateur '${name}' a été supprimé`);
	expect((await request.head(`/api/users/${name}`)).status()).toBe(404);
});

for (const name of ["cor02-nom", "cor02-Élodie Dupont", "cor02-nom#suffixe", "cor02-nom?option=1", "cor02-nom%23suffixe", "cor02-nom%"]) {
	test(`utilisateurs COR-02 : CRUD et identité exacte pour ${name}`, async ({ page, request, usersToCleanUp }) => {
		const url = `/api/users/${encodeURIComponent(name)}`;
		const witnesses = ["cor02-nom", "cor02-nom#suffixe", "cor02-nom%23suffixe"].filter(other => other !== name);
		usersToCleanUp.push(name, ...witnesses);
		for (const other of witnesses) {
			expect((await request.post("/api/users", { data: {
				name: other, password: "abcd", pseudo: other, description: `Témoin ${other}`, sexe: "F",
			} })).status()).toBe(201);
		}
		expect((await request.head(url)).status()).toBe(404);
		await page.goto("/#/users/create");
		await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toBeFocused();
		await page.getByLabel("Nom *", { exact: true }).fill(name);
		await page.getByLabel("Mot de passe *", { exact: true }).fill("abcd");
		await page.getByLabel("Description *", { exact: true }).fill(`Création ${name}`);
		await page.getByRole("combobox", { name: "Genre *", exact: true }).press("ArrowDown");
		await page.getByRole("option", { name: "Femme", exact: true }).click();
		await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeEnabled();
		await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
		await expect(page.locator(".user-detail .detail-title")).toHaveText(name);
		expect((await request.head(url)).status()).toBe(204);
		expect(await (await request.get(url)).json()).toMatchObject({ name, description: `Création ${name}` });
		await page.getByRole("button", { name: "Fermer", exact: true }).click();
		await expect(page.locator(".user-detail")).toHaveCount(0);
		await page.getByRole("link", { name: "Créer un utilisateur", exact: true }).click();
		await page.getByLabel("Nom *", { exact: true }).fill(name);
		await expect(page.getByText("Le nom d'utilisateur existe déjà", { exact: true })).toBeVisible();
		page.once("dialog", dialog => dialog.accept());
		await page.getByRole("button", { name: "Fermer", exact: true }).click();
		await expect(page.locator(".user-detail")).toHaveCount(0);
		await page.getByRole("textbox", { name: "Rechercher...", exact: true }).fill(name);
		const row = page.getByRole("listitem").filter({ has: page.getByText(name, { exact: true }) });
		const avatar = row.getByRole("img", { name, exact: true });
		await expect(avatar).toHaveAttribute("src", `${url}/avatar`);
		await expect.poll(() => avatar.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
		await avatar.click();
		await expect(page.locator(".user-detail .detail-title")).toHaveText(name);
		const detailUrl = page.url();
		expect(decodeURIComponent(new URL(detailUrl).hash)).toBe(`#/users/edit/${name}`);
		await page.reload();
		await expect(page).toHaveURL(detailUrl);
		await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toBeFocused();
		await expect(page.locator(".user-detail .detail-title")).toHaveText(name);
		await expect(page.getByLabel("Description *", { exact: true })).toHaveValue(`Création ${name}`);
		await page.getByLabel("Description *", { exact: true }).fill(`Modification ${name}`);
		await expect(page.getByLabel("Description *", { exact: true })).toHaveValue(`Modification ${name}`);
		await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
		await expect(page.locator(".v-snackbar")).toContainText(`L'utilisateur '${name}' a été mis à jour`);
		expect(await (await request.get(url)).json()).toMatchObject({ name, description: `Modification ${name}` });
		await page.getByRole("button", { name: "Supprimer", exact: true }).click();
		await page.getByRole("button", { name: "Oui", exact: true }).click();
		await expect(page).toHaveURL(/\/users\/list$/);
		expect((await request.head(url)).status()).toBe(404);
		for (const other of witnesses) {
			expect(await (await request.get(`/api/users/${encodeURIComponent(other)}`)).json())
				.toMatchObject({ name: other, description: `Témoin ${other}` });
		}
	});
}

test("utilisateurs : délai du nom, validation en attente et pseudo facultatif", async ({ page }) => {
	await page.goto("/#/users/create");
	await expect(page.getByLabel("Nom *", { exact: true })).toBeVisible();
	// Attendre l'autofocus de la toolbar différée avant de saisir dans le détail.
	await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toBeFocused();
	const save = page.getByRole("button", { name: "Enregistrer", exact: true });
	await page.getByLabel("Mot de passe *", { exact: true }).fill("abcd");
	await expect(page.getByLabel("Mot de passe *", { exact: true })).toHaveValue("abcd");
	await page.getByLabel("Description *", { exact: true }).fill("Description temporaire");
	await page.getByLabel("Description *", { exact: true }).fill("");
	await expect(page.getByText("La description est obligatoire", { exact: true })).toBeVisible();
	await page.getByLabel("Description *", { exact: true }).fill("Compte temporaire");
	await expect(save).toBeDisabled();
	await page.getByRole("combobox", { name: "Genre *", exact: true }).press("ArrowDown");
	await page.getByRole("option", { name: "Femme", exact: true }).click();
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("");
	let validation;
	await page.route("**/api/users/mod04-disponible", route => { validation = route; });
	await page.clock.install();
	await page.clock.pauseAt(new Date(Date.now() + 100));
	await page.getByLabel("Nom *", { exact: true }).fill("mod04-disponible");
	await page.clock.fastForward(999);
	await expect(page.getByText("Vérification du nom en cours", { exact: true })).toHaveCount(0);
	await expect(save).toBeDisabled();
	await page.clock.fastForward(1);
	await expect(page.getByText("Vérification du nom en cours", { exact: true })).toBeVisible();
	await expect(save).toBeDisabled();
	await expect.poll(() => Boolean(validation)).toBe(true);
	await validation.continue();
	// L'horloge ne doit plus retenir la transition de sortie du message Vuetify.
	await page.clock.resume();
	await expect(page.getByText("Vérification du nom en cours", { exact: true })).toHaveCount(0);
	await expect(save).toBeEnabled();
	page.once("dialog", dialog => dialog.accept());
	await page.getByRole("button", { name: "Fermer", exact: true }).click();
	await expect(page).toHaveURL(/\/users\/list$/);
});

test("formulaire : abandon refusé puis accepté, état réinitialisé entre utilisateurs", async ({ page }) => {
	await page.goto("/#/users/edit/alice");
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Alice");
	await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toBeFocused();
	await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
	await expect(page.getByLabel("Mot de passe *", { exact: true })).toHaveAttribute("type", "text");
	await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeDisabled();
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCSS("font-weight", "400");
	await page.getByLabel("Pseudo", { exact: true }).fill("Modification à abandonner");
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCSS("font-weight", "700");
	page.once("dialog", (dialog) => dialog.dismiss());
	await page.getByRole("button", { name: "Fermer", exact: true }).click();
	await expect(page).toHaveURL(/\/users\/edit\/alice$/);
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Modification à abandonner");
	page.once("dialog", (dialog) => dialog.accept());
	await page.getByRole("button", { name: "Fermer", exact: true }).click();
	await expect(page).toHaveURL(/\/users\/list$/);
	await expect(page.getByRole("button", { name: "Fermer", exact: true })).toHaveCount(0);
	await page.getByRole("listitem").getByText("bruno", { exact: true }).click();
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Bruno");
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCSS("font-weight", "400");
	await expect(page.getByLabel("Mot de passe *", { exact: true })).toHaveAttribute("type", "password");
	await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
	await page.getByRole("button", { name: "Fermer", exact: true }).click();
	await expect(page).toHaveURL(/\/users\/list$/);
});

test("administrateur protégé, menu et informations", async ({ page }, testInfo) => {
	await page.goto("/#/users/edit/serge");
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Administrateur");
	await expect(page.getByRole("button", { name: "Supprimer", exact: true })).toBeDisabled();
	await expect(page.getByRole("checkbox", { name: "actif" })).toBeDisabled();
	await page.getByRole("button", { name: "Menu", exact: true }).click();
	const moviesLink = page.getByRole("link", { name: "liste des films", exact: true });
	const usersLink = page.getByRole("link", { name: "gestion des utilisateurs", exact: true });
	await expect(moviesLink).toBeVisible();
	await expect(page.getByText("Menu", { exact: true })).toHaveCSS("color", "rgb(139, 69, 19)");
	for (const title of [moviesLink.getByText("liste des films", { exact: true }), usersLink.getByText("gestion des utilisateurs", { exact: true })]) {
		await expect(title).toHaveCSS("font-size", "14px");
		await expect(title).toHaveCSS("letter-spacing", "0.14px");
	}
	await expect(moviesLink).toHaveCSS("color", "rgb(139, 69, 19)");
	await expect(usersLink).toHaveCSS("color", "rgb(221, 221, 221)");
	await page.screenshot({ path: testInfo.outputPath("navigation.png"), animations: "disabled" });
	await moviesLink.click();
	await expect(page.getByText("Film de test 01", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Menu", exact: true }).click();
	await expect(moviesLink).toHaveCSS("color", "rgb(221, 221, 221)");
	await expect(usersLink).toHaveCSS("color", "rgb(139, 69, 19)");
	await page.screenshot({ path: testInfo.outputPath("navigation-movies.png"), animations: "disabled" });
	await moviesLink.click();
	await expect(moviesLink).not.toBeInViewport();
	await page.getByRole("button", { name: "Profil", exact: true }).click();
	await page.getByText("à propos", { exact: true }).click();
	const flash = page.getByRole("dialog", { name: /Filmotheque version/ });
	await expect(flash).toBeVisible();
	await expect(flash.locator(".v-card-title")).toHaveCSS("font-size", "20px");
	await expect(flash.locator(".v-card-text")).toHaveCSS("font-size", "14px");
	await expect(flash.locator(".v-card-text")).toHaveCSS("line-height", "20px");
	await expect(flash.getByRole("heading", { level: 1 }).first()).toHaveCSS("font-size", "28px");
	await expect(flash.locator(".v-card")).toHaveCSS("border-top-left-radius", "15px");
	await expect(flash.locator(".v-card-title")).toHaveCSS("border-bottom-width", "1px");
	await expect(page.getByRole("button", { name: "OK", exact: true })).toHaveCSS("font-size", "14px");
	await expect(page.getByRole("button", { name: "OK", exact: true })).toBeInViewport();
	const nodejsLink = flash.getByRole("link", { name: "nodejs", exact: true });
	await expect(nodejsLink).toHaveCSS("color", "rgb(221, 221, 221)");
	await expect(nodejsLink).toHaveCSS("text-decoration-line", "underline");
	await expect(nodejsLink).toHaveAttribute("href", "https://nodejs.org/fr/");
	await page.screenshot({ path: testInfo.outputPath("about.png"), animations: "disabled" });
	const urlBeforeChangelog = page.url();
	const changelog = flash.getByRole("heading", { name: "Changelog", exact: true });
	await expect(changelog).not.toBeInViewport();
	await flash.getByRole("link", { name: "Changelog", exact: true }).click();
	await expect(flash).toBeVisible();
	await expect(changelog).toBeInViewport();
	await expect(page).toHaveURL(urlBeforeChangelog);
	await expect(page.getByRole("button", { name: "OK", exact: true })).toBeInViewport();
	await page.screenshot({ path: testInfo.outputPath("changelog.png"), animations: "disabled" });
	await page.getByRole("button", { name: "OK", exact: true }).click();
	await expect(page.getByText("Film de test 01", { exact: true })).toBeVisible();
});

test("erreur API affichée et recherche réutilisable après fermeture", async ({ page }, testInfo) => {
	await page.goto("/#/movies");
	await expect(page.getByText("Film de test 01", { exact: true })).toBeVisible();
	for (const scenario of [
		{ name: "json", response: { status: 500, json: { error_description: "Erreur de test" } }, detail: "500 (Erreur de test)" },
		{ name: "html", response: { status: 503, contentType: "text/html", body: "<h1>Indisponible</h1>" }, detail: "503" },
		{ name: "network", detail: "Failed to fetch" },
	]) {
		await page.route("**/api/movies?**", (route) => scenario.response ? route.fulfill(scenario.response) : route.abort("failed"));
		await page.reload();
		const dialog = page.getByRole("dialog", { name: "ERREUR", exact: true });
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText("Impossible de récupérer la liste des films");
		await expect(dialog).toContainText(scenario.detail);
		await page.screenshot({ path: testInfo.outputPath(`error-${scenario.name}.png`), animations: "disabled" });
		await page.getByRole("button", { name: "OK", exact: true }).click();
		await page.unroute("**/api/movies?**");
		await page.getByRole("textbox", { name: "Rechercher...", exact: true }).fill("Film de test 03");
		await expect(page.getByText("Film de test 03", { exact: true })).toBeVisible();
	}
});

for (const validation of [false, true]) {
	test(`utilisateurs : erreurs du ${validation ? "contrôle du nom" : "chargement du détail"} et récupération`, async ({ page }) => {
		await page.goto("/#/users/list");
		await expect(page.getByRole("listitem").getByText("alice", { exact: true })).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toBeFocused();
		for (const scenario of [
			{ response: { status: 500, json: { error_description: "Erreur de test" } }, detail: "500 (Erreur de test)" },
			{ response: { status: 503, contentType: "text/html", body: "<h1>Indisponible</h1>" }, detail: "503" },
			{ detail: "Failed to fetch" },
		]) {
			await page.route("**/api/users/alice", route => scenario.response ? route.fulfill(scenario.response) : route.abort("failed"));
			if (validation) {
				await page.getByRole("link", { name: "Créer un utilisateur" }).click();
				await page.getByRole("textbox", { name: "Nom *", exact: true }).fill("alice");
			} else { await page.getByRole("listitem").getByText("alice", { exact: true }).click(); }
			const dialog = page.getByRole("dialog", { name: "ERREUR", exact: true });
			await expect(dialog).toHaveCount(1);
			await expect(dialog).toContainText(validation ?
				"Impossible de savoir si l'utilisateur 'alice' existe" : "Impossible de récupérer l'utilisateur alice");
			await expect(dialog).toContainText(scenario.detail);
			await dialog.getByRole("button", { name: "OK", exact: true }).click();
			await page.unroute("**/api/users/alice");
			if (validation) {
				await expect(page.getByRole("button", { name: "Fermer", exact: true })).toBeEnabled();
				const name = page.getByRole("textbox", { name: "Nom *", exact: true });
				const existingName = page.waitForResponse("**/api/users/bruno");
				await name.fill("bruno");
				expect((await existingName).status()).toBe(204);
				await expect(page.getByText("Le nom d'utilisateur existe déjà", { exact: true })).toBeVisible();
				const availableName = page.waitForResponse("**/api/users/mod03-disponible");
				await name.fill("mod03-disponible");
				expect((await availableName).status()).toBe(404);
				await expect(page.getByText("Le nom d'utilisateur existe déjà", { exact: true })).toHaveCount(0);
				await expect(page.getByText("Vérification du nom en cours", { exact: true })).toHaveCount(0);
			} else {
				await expect(page).toHaveURL(/\/users\/list$/);
				await page.getByRole("listitem").getByText("alice", { exact: true }).click();
				await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Alice");
			}
			await expect(page.locator(".user-detail .spinner")).not.toHaveClass(/animated/);
			if (validation) { page.once("dialog", dialog => dialog.accept()); }
			await page.getByRole("button", { name: "Fermer", exact: true }).click();
			await expect(page).toHaveURL(/\/users\/list$/);
			await expect(page.locator(".user-detail")).toHaveCount(0);
		}
	});
}

for (const operation of [
	{ type: "created", method: "POST", verb: "créer" },
	{ type: "updated", method: "PATCH", verb: "sauver" },
	{ type: "deleted", method: "DELETE", verb: "supprimer" },
]) {
	const openForm = async (page, name) => {
		await page.goto("/#/users/list");
		await expect(page.getByRole("listitem").getByText("alice", { exact: true })).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Rechercher...", exact: true })).toBeFocused();
		if (operation.type === "created") {
			await page.getByRole("link", { name: "Créer un utilisateur" }).click();
			await page.getByRole("textbox", { name: "Nom *", exact: true }).fill(name);
			await page.getByLabel("Mot de passe *", { exact: true }).fill("abcd");
			await page.getByLabel("Description *", { exact: true }).fill("Compte de test MOD-03");
			await page.getByRole("combobox", { name: "Genre *", exact: true }).press("ArrowDown");
			await page.getByRole("option", { name: "Femme" }).click();
		} else {
			await page.getByRole("listitem").getByText(name, { exact: true }).click();
			await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Alice");
		}
		if (operation.type !== "deleted") {
			await page.getByLabel("Pseudo", { exact: true }).fill("Modification MOD-03");
			await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeEnabled();
		}
	};
	const submit = async page => {
		if (operation.type === "deleted") {
			await page.getByRole("button", { name: "Supprimer", exact: true }).click();
			await page.getByRole("button", { name: "Oui", exact: true }).click();
		} else { await page.getByRole("button", { name: "Enregistrer", exact: true }).click(); }
	};

	test(`utilisateurs ${operation.type} : refus JSON, HTML et réseau, puis récupération`, async ({ page }, testInfo) => {
		const name = operation.type === "created" ? `mod03-${testInfo.project.name}` : "alice";
		await openForm(page, name);
		for (const scenario of [
			{ response: { status: 403, json: { error_description: "Mutation refusée" } }, detail: "Request failed with status code 403 (Mutation refusée)" },
			{ response: { status: 503, contentType: "text/html", body: "<h1>Indisponible</h1>" }, detail: "Request failed with status code 503" },
			{ detail: "Failed to fetch" },
		]) {
			await page.route("**/api/users**", route => {
				if (route.request().method() !== operation.method) { return route.continue(); }
				return scenario.response ? route.fulfill(scenario.response) : route.abort("failed");
			});
			await submit(page);
			const dialog = page.getByRole("dialog", { name: "ERREUR", exact: true });
			await expect(dialog).toHaveCount(1);
			await expect(dialog).toContainText(`Impossible de ${operation.verb} l'utilisateur ${name}`);
			await expect(dialog).toContainText(scenario.detail);
			await dialog.getByRole("button", { name: "OK", exact: true }).click();
			await expect(page.locator(".user-detail .spinner")).not.toHaveClass(/animated/);
			await expect(page.getByRole("button", { name: "Fermer", exact: true })).toBeEnabled();
			await expect(page.locator(".v-snackbar")).not.toBeVisible();
			await expect(page.getByRole("button", { name: operation.type === "deleted" ? "Supprimer" : "Enregistrer", exact: true })).toBeEnabled();
			await page.unroute("**/api/users**");
		}
		// Abandonner reste possible après le refus ; un seul dialogue, aucune relance globale.
		page.once("dialog", dialog => dialog.accept());
		await page.getByRole("button", { name: "Fermer", exact: true }).click();
		await expect(page).toHaveURL(/\/users\/list$/);
	});

	test(`utilisateurs ${operation.type} : mutation réussie puis rafraîchissement refusé`, async ({ page, request, usersToCleanUp }, testInfo) => {
		const name = `cor04-${operation.type}-${testInfo.project.name}`;
		usersToCleanUp.push(name);
		if (operation.type !== "created") {
			const response = await request.post("/api/users", { data: {
				name, active: true, password: "abcd", pseudo: "Alice", description: "Compte COR-04", sexe: "F",
			} });
			expect(response.ok()).toBe(true);
		}
		await openForm(page, name);
		const confirmations = [];
		page.on("dialog", dialog => { confirmations.push(dialog.message()); return dialog.dismiss(); });
		const previousList = await page.locator(".user-list [role=listitem]").allTextContents();
		const refreshes = [];
		const writes = [];
		await page.route("**/api/users**", route => {
			if (["POST", "PATCH", "DELETE"].includes(route.request().method())) {
				writes.push(route.request().method());
				return route.continue();
			}
			if (route.request().method() === "GET" && new URL(route.request().url()).pathname === "/api/users") {
				refreshes.push(route);
				return;
			}
			return route.continue();
		});
		await submit(page);
		await expect.poll(() => refreshes.length).toBe(1);
		// L'émission updated ne fait pas attendre le rafraîchissement au formulaire.
		await expect(page.locator(".user-detail .spinner")).not.toHaveClass(/animated/);
		await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeDisabled();
		await expect(page.getByRole("button", { name: "Fermer", exact: true })).toBeEnabled({ enabled: operation.type !== "deleted" });
		await expect(page.getByLabel("Pseudo", { exact: true })).toBeEnabled({ enabled: operation.type !== "deleted" });
		await expect(page.locator(".v-snackbar")).not.toBeVisible();
		await refreshes[0].fulfill({ status: 503, json: { error_description: "Rafraîchissement refusé" } });
		await expect(page).toHaveURL(new RegExp(operation.type === "deleted" ? "/users/list$" : `/users/edit/${name}$`));
		const success = { created: "créé", updated: "mis à jour", deleted: "supprimé" }[operation.type];
		await expect(page.locator(".v-snackbar")).toContainText(`L'utilisateur '${name}' a été ${success}`);
		const warning = page.getByRole("status").filter({ hasText: "La liste n'a pas pu être actualisée" });
		await expect(warning).toContainText("Les données affichées ne sont pas à jour");
		await expect(warning).toBeInViewport();
		await expect(page.getByRole("dialog", { name: "ERREUR", exact: true })).toHaveCount(0);
		expect(await page.locator(".user-list [role=listitem]").allTextContents()).toEqual(previousList);
		await page.screenshot({ path: testInfo.outputPath("refresh-failed.png"), animations: "disabled" });
		// Vérifier la mutation sur le vrai backend temporaire, indépendamment de la liste retenue.
		if (operation.type === "deleted") {
			expect((await request.head(`/api/users/${name}`)).status()).toBe(404);
			await expect(page.locator(".user-detail")).toHaveCount(0);
		} else {
			expect((await (await request.get(`/api/users/${name}`)).json()).pseudo).toBe("Modification MOD-03");
			await expect(page.getByLabel("Nom *", { exact: true })).toHaveCount(0);
			await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Modification MOD-03");
			await expect(page.getByLabel("Pseudo", { exact: true })).toBeEnabled();
			await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeDisabled();
			await expect(page.getByRole("button", { name: "Fermer", exact: true })).toBeEnabled();
		}
		const retry = page.getByRole("button", { name: "Actualiser la liste", exact: true });
		await retry.click();
		await expect.poll(() => refreshes.length).toBe(2);
		await expect(retry).toBeDisabled();
		await refreshes[1].abort("failed");
		await expect(retry).toBeEnabled();
		await expect(warning).toBeInViewport();
		await page.screenshot({ path: testInfo.outputPath("refresh-failed-again.png"), animations: "disabled" });
		// La navigation reste disponible après le nouvel échec, sans faux état sale.
		if (operation.type !== "deleted") {
			await page.getByRole("button", { name: "Fermer", exact: true }).click();
			await expect(page).toHaveURL(/\/users\/list$/);
		}
		await page.getByRole("link", { name: "liste des films", exact: true }).evaluate(link => link.click());
		await expect(page).toHaveURL(/\/movies$/);
		await page.getByRole("link", { name: "gestion des utilisateurs", exact: true }).evaluate(link => link.click());
		await expect(page).toHaveURL(/\/users\/list$/);
		await expect(warning).toBeVisible();
		await retry.click();
		await expect.poll(() => refreshes.length).toBe(3);
		await refreshes[2].continue();
		await expect(warning).toHaveCount(0);
		if (operation.type === "deleted") {
			await expect(page.locator(".user-list [role=listitem]").getByText(name, { exact: true })).toHaveCount(0);
		} else {
			const row = page.locator(".user-list [role=listitem]").filter({ hasText: name });
			await expect(row).toBeVisible();
			await expect(row).toContainText("Modification MOD-03");
		}
		await page.screenshot({ path: testInfo.outputPath("refresh-recovered.png"), animations: "disabled" });
		expect(writes).toEqual([operation.method]);
		expect(confirmations).toEqual([]);
		await page.unroute("**/api/users**");
	});
}

test("utilisateurs : récupération avec filtre et deux pages conservées", async ({ page, request, usersToCleanUp }, testInfo) => {
	const filter = `cor04-pages-${testInfo.project.name}`;
	const names = Array.from({ length: 8 }, (_, index) => `${filter}-${index + 1}`);
	usersToCleanUp.push(...names);
	for (const name of names) {
		expect((await request.post("/api/users", { data: {
			name, active: true, password: "abcd", pseudo: "Avant", description: "Pagination COR-04", sexe: "M",
		} })).ok()).toBe(true);
	}
	await page.goto("/#/users/list");
	const search = page.getByRole("textbox", { name: "Rechercher...", exact: true });
	await expect(search).toBeFocused();
	await search.fill(filter);
	const rows = page.locator(".user-list [role=listitem]");
	await expect(rows).toHaveCount(3);
	await expect(rows.first()).toContainText(names[0]);
	const viewport = page.viewportSize();
	await page.setViewportSize({ ...viewport, height: 240 });
	await page.locator(".user-list .infinite-list").evaluate(list => { list.scrollTop = list.scrollHeight; });
	await expect(rows).toHaveCount(6);
	// Revenir en haut et garder la liste défilante : revenir à pleine hauteur en bas
	// pourrait légitimement demander une troisième page avant la mutation testée.
	await page.locator(".user-list .infinite-list").evaluate(list => { list.scrollTop = 0; });
	await page.setViewportSize({ ...viewport, height: 320 });
	await rows.getByText(names[0], { exact: true }).click();
	await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue("Avant");
	await page.getByLabel("Pseudo", { exact: true }).fill("Après");
	const reads = [];
	const writes = [];
	await page.route("**/api/users**", route => {
		const method = route.request().method();
		if (["POST", "PATCH", "DELETE"].includes(method)) { writes.push(method); }
		if (method === "GET" && new URL(route.request().url()).pathname === "/api/users") {
			reads.push(route);
			return;
		}
		return route.continue();
	});
	await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
	await expect.poll(() => reads.length).toBe(1);
	await reads[0].fulfill({ status: 503, body: "Indisponible" });
	const warning = page.getByRole("status").filter({ hasText: "La liste n'a pas pu être actualisée" });
	await expect(warning).toBeVisible();
	await page.getByRole("button", { name: "Fermer", exact: true }).click();
	await expect(page).toHaveURL(/\/users\/list$/);
	await expect(rows).toHaveCount(6);
	await expect(rows.first()).toContainText("Avant");
	await page.getByRole("button", { name: "Actualiser la liste", exact: true }).click();
	await expect.poll(() => reads.length).toBe(2);
	await reads[1].continue();
	await expect(warning).toHaveCount(0);
	await expect(rows).toHaveCount(6);
	await expect(rows.first()).toContainText("Après");
	await expect(search).toHaveValue(filter);
	for (const read of reads) {
		const params = new URL(read.request().url()).searchParams;
		expect(Object.fromEntries(params)).toEqual({ page: "1", page_size: "6", search: filter });
	}
	// La relance conserve aussi la prochaine page, pas seulement les six lignes affichées.
	await page.setViewportSize({ ...viewport, height: 240 });
	await page.locator(".user-list .infinite-list").evaluate(list => { list.scrollTop = list.scrollHeight; });
	await expect.poll(() => reads.length).toBe(3);
	expect(Object.fromEntries(new URL(reads[2].request().url()).searchParams)).toEqual({ page: "3", page_size: "3", search: filter });
	await reads[2].continue();
	await expect(rows).toHaveCount(8);
	expect(await rows.locator(".user-row > div:nth-child(2)").allTextContents()).toEqual(names);
	expect(writes).toEqual(["PATCH"]);
	await page.setViewportSize(viewport);
	await page.unroute("**/api/users**");
});

test.describe("lecteur", () => {
	test.use({ httpCredentials: { username: "alice", password: "test-alice" } });
	test("films accessibles sans menu administrateur", async ({ page }) => {
		await page.goto("/#/movies");
		await expect(page.getByText("Film de test 01", { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveCount(0);
	});
});
