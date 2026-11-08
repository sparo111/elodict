// Chiede il permesso del microfono e dice com'è andata, senza registrare niente.

export type MicResult = "ok" | "denied" | "none" | "error";
type GetUserMedia = (constraints: MediaStreamConstraints) => Promise<MediaStream>;

export async function requestMic(getUserMedia?: GetUserMedia): Promise<MicResult> {
  const gum = getUserMedia ?? navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (!gum) return "error";
  try {
    const stream = await gum({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // serviva solo il permesso: si spegne subito
    return "ok";
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
    if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "none";
    return "error";
  }
}
