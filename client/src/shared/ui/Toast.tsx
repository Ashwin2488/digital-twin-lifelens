import { useEffect, useState } from "react";

export function useToast() {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!text) return;
    const t = window.setTimeout(() => setText(""), 2400);
    return () => window.clearTimeout(t);
  }, [text]);
  return { text, showToast: setText };
}

export function Toast({ text }: { text: string }) {
  if (!text) return null;
  return <div className="toast show">{text}</div>;
}
