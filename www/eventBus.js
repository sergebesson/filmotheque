import mitt from "mitt";

const eventBus = mitt();
const eventName = {
	// Payload { message: string, error: Error (response HTTP éventuelle) }.
	// Le propriétaire de l'opération émet ; le dialogue commun possède la présentation.
	ERROR: "error",
};

export { eventBus, eventName };
