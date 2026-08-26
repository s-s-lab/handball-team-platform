import type { ConsoleActionInput } from "./types";

function formKeyForPayloadKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function buildConsoleActionFormData(input: ConsoleActionInput) {
  const formData = new FormData();
  formData.set("matchId", input.matchId);
  formData.set("clientActionId", input.clientActionId);
  formData.set("expectedVersion", String(input.expectedVersion));
  formData.set("action", input.action);

  for (const [key, value] of Object.entries(input.payload)) {
    const formKey = formKeyForPayloadKey(key);
    if (typeof value === "boolean") {
      formData.set(formKey, value ? "on" : "off");
    } else {
      formData.set(formKey, String(value));
    }
  }

  return formData;
}
