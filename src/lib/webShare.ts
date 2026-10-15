export type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export async function shareWithWebApi(
  payload: SharePayload,
  onClipboard?: () => void,
): Promise<"shared" | "clipboard" | "cancelled"> {
  const url = payload.url || window.location.href;
  const data: ShareData = {
    title: payload.title,
    text: payload.text,
    url,
  };

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    onClipboard?.();
    return "clipboard";
  } catch {
    window.prompt("Copy this link:", url);
    return "clipboard";
  }
}
