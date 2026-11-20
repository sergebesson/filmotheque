import { test, expect } from "@playwright/test";

test("catalogue vide : accueil, recherche et chargement complet sans erreur", async ({ page, request }, testInfo) => {
	const errors = [];
	page.on("pageerror", error => errors.push(error.message));
	await page.addInitScript(() => localStorage.setItem("last_version", "999.0.0"));
	expect((await (await request.get("/api/infos")).json()).number_of_movies).toBe(0);
	await page.goto("/");
	await expect(page).toHaveTitle(/0 films$/);
	await expect(page.getByText("Aucun film", { exact: true })).toBeVisible();
	const search = page.getByRole("textbox", { name: "Rechercher...", exact: true });
	const searching = page.waitForResponse(response => new URL(response.url()).searchParams.get("search") === "Batman");
	await search.fill("Batman");
	expect((await searching).status()).toBe(200);
	const all = page.waitForResponse(response => new URL(response.url()).searchParams.get("page_size") === "1");
	await page.getByRole("button", { name: "Tout charger", exact: true }).click();
	expect((await all).status()).toBe(200);
	await expect(search).toHaveValue("");
	await expect(page.getByText("Aucun film", { exact: true })).toBeVisible();
	await expect(page.getByRole("dialog", { name: "ERREUR", exact: true })).toHaveCount(0);
	expect(errors).toEqual([]);
	await page.screenshot({ path: testInfo.outputPath("catalogue-vide.png"), animations: "disabled" });
});
