/**
 * Transport sans présentation ni notification métier. Résout { status, data } ("" si vide).
 * url est résolue depuis document.baseURI ; params devient une query via URLSearchParams.set.
 * method vaut "get" par défaut. data !== undefined produit un corps JSON et son Content-Type.
 * Le corps reçu est décodé en JSON seulement si non vide et de Content-Type application/json,
 * sinon conservé comme texte. validateStatus accepte les 2xx par défaut, après ce décodage.
 * Rejette les statuts refusés par validateStatus avec error.response = { status, data } ;
 * les erreurs réseau et de décodage JSON sont propagées telles quelles à l'appelant.
 * @param {{url: string, method?: string, params?: object, data?: unknown, validateStatus?: (status: number) => boolean}} request
 */
async function callApiBackend({
	url, method = "get", params = {}, data,
	validateStatus = (status) => status >= 200 && status < 300,
}) {
	const requestUrl = new URL(url, document.baseURI);
	for (const [name, value] of Object.entries(params)) {
		requestUrl.searchParams.set(name, value);
	}
	const headers = { Accept: "application/json" };
	if (data !== undefined) {
		headers["Content-Type"] = "application/json";
	}
	const response = await fetch(requestUrl, {
		method: method.toUpperCase(), headers,
		body: data === undefined ? undefined : JSON.stringify(data),
	});
	const text = await response.text();
	const result = {
		status: response.status,
		data: text && response.headers.get("content-type")?.includes("application/json") ?
			JSON.parse(text) : text,
	};
	if (!validateStatus(result.status)) {
		const error = new Error(`Request failed with status code ${result.status}`);
		error.response = result;
		throw error;
	}
	return result;
}

export { callApiBackend };
