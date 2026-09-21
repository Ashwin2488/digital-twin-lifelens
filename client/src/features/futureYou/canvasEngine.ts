export type CanvasEvent = {
  id: string;
  icon: string;
  title: string;
  category: "family" | "assets" | "career" | string;
  recommended: boolean;
  cost: number;
  monthly: number;
  stress: number;
  protection?: number;
  asset?: number;
  caption: string;
};

export type CanvasCatalog = {
  events: CanvasEvent[];
  assumptions: {
    monthlySpend: number;
    monthlyReliefCap: number;
    stressBase: number;
    connectionRelief: number;
    runwayFloor: number;
    runwayCap: number;
  };
};

export type PlacedEvent = { id: string; slot: number };

export function placedEvents(catalog: CanvasCatalog, events: PlacedEvent[]) {
  return events.map((placed) => catalog.events.find((event) => event.id === placed.id)).filter(Boolean) as CanvasEvent[];
}

export function addCanvasEvent(catalog: CanvasCatalog, events: PlacedEvent[], id: string, slot?: number) {
  if (!catalog.events.some((event) => event.id === id)) return { events, toast: null as string | null };
  const existing = events.find((event) => event.id === id);
  if (existing) {
    if (Number.isInteger(slot)) {
      return { events: events.map((e) => (e.id === id ? { ...e, slot: slot as number } : e)), toast: null };
    }
    return { events, toast: "That event is already on your canvas" };
  }
  const occupied = new Set(events.map((event) => event.slot));
  const nextSlot = Number.isInteger(slot) ? (slot as number) : ([0, 1, 2, 3].find((x) => !occupied.has(x)) ?? 3);
  return { events: [...events, { id, slot: nextSlot }], toast: null };
}

export function canvasForecast(catalog: CanvasCatalog, events: PlacedEvent[], connections: string[], startingAssets: number) {
  const selected = placedEvents(catalog, events);
  const { monthlySpend, monthlyReliefCap, stressBase, connectionRelief, runwayFloor } = catalog.assumptions;
  const upfront = selected.reduce((sum, event) => sum + event.cost, 0);
  const monthly = selected.reduce((sum, event) => sum + event.monthly, 0);
  const assets = selected.reduce((sum, event) => sum + (event.asset || 0), 0);
  const stress = Math.max(0, Math.min(100, stressBase + selected.reduce((sum, event) => sum + event.stress, 0) - connections.length * connectionRelief));
  const runway = Math.max(runwayFloor, Math.round((startingAssets - upfront) / Math.max(1, monthlySpend - Math.min(monthlyReliefCap, monthly))));
  return { selected, upfront, monthly, assets: startingAssets + assets, stress, runway };
}
