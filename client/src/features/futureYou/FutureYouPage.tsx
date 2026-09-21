import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAvatar, useCustomers, useExperience, usePatchAvatar, useSharePlan } from "../../shared/api/hooks";
import { Toast, useToast } from "../../shared/ui/Toast";
import { GoalPlanPanel } from "./GoalPlanPanel";
import { LifeGamePanel } from "./LifeGamePanel";
import { FutureCanvasPanel } from "./FutureCanvasPanel";
import { AvatarStudio, type AvatarProfile } from "./AvatarStudio";
import { newGame } from "./gameEngine";
import type { PlacedEvent } from "./canvasEngine";

type Tab = "goal" | "game" | "canvas";

export function FutureYouPage() {
  const [params] = useSearchParams();
  const experience = useExperience();
  const chrome = experience.data?.chrome;
  const [customerId, setCustomerId] = useState(params.get("scenario") || "");
  const [tab, setTab] = useState<Tab>("goal");
  const [funMode, setFunMode] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [intent, setIntent] = useState("");
  const [game, setGame] = useState<ReturnType<typeof newGame> | null>(null);
  const [events, setEvents] = useState<PlacedEvent[]>([]);
  const [connections, setConnections] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const book = useCustomers({ limit: 200 });
  const avatarQ = useAvatar();
  const patchAvatar = usePatchAvatar();
  const sharePlan = useSharePlan();
  const { text, showToast } = useToast();
  const look = avatarQ.data || experience.data?.avatar?.start || { coins: 0, owned: [], equipped: [], colour: "sky" };

  useEffect(() => {
    if (!customerId && chrome?.defaultCustomerId) setCustomerId(chrome.defaultCustomerId);
  }, [chrome, customerId]);

  useEffect(() => {
    if (experience.data && !game) setGame(newGame(experience.data.game.start));
  }, [experience.data, game]);

  useEffect(() => {
    document.body.classList.toggle("fun-mode", funMode);
    return () => document.body.classList.remove("fun-mode");
  }, [funMode]);

  const customers = book.data?.customers || [];
  const selected = customers.find((c) => c.id === customerId || c.scenarioId === customerId);
  const firstName = (selected?.fullName || "You").split(" ")[0];
  const tags = useMemo(() => {
    const list = [];
    if (selected?.age) list.push(`Age ${selected.age}`);
    if (selected?.eventLabel) list.push(selected.eventLabel);
    if (selected?.segment) list.push(selected.segment);
    return list;
  }, [selected]);

  function persistAvatar(next: AvatarProfile) {
    patchAvatar.mutate(next);
  }

  function addCoins(delta: number) {
    persistAvatar({ ...look, coins: look.coins + delta });
  }

  function setTabSafe(next: Tab) {
    if (next === "canvas" && !funMode) return;
    setTab(next);
  }

  return (
    <div className="app-view active">
      <div className="experience-tabs" role="tablist" aria-label="Customer future experiences">
        <button type="button" className={tab === "goal" ? "active" : ""} data-experience="goal" onClick={() => setTabSafe("goal")}>
          <b>01</b><span><strong>Goal Plan</strong><small>Any customer · live levers</small></span>
        </button>
        <button type="button" className={tab === "game" ? "active" : ""} data-experience="game" onClick={() => setTabSafe("game")}>
          <b>02</b><span><strong>Life Game</strong><small>Play through 12 months</small></span>
        </button>
        <button type="button" className={tab === "canvas" ? "active" : ""} data-experience="canvas" onClick={() => setTabSafe("canvas")}>
          <b>03</b><span><strong>Future Canvas</strong><small>Fun mode</small></span>
        </button>
        <label className="fun-mode-toggle">
          <input type="checkbox" checked={funMode} onChange={(e) => {
            setFunMode(e.target.checked);
            if (!e.target.checked && tab === "canvas") setTab("goal");
          }} /> Fun mode
        </label>
      </div>

      {tab === "goal" && (
        <GoalPlanPanel
          customerId={customerId}
          setCustomerId={setCustomerId}
          customers={customers}
          intent={intent}
          setIntent={setIntent}
          onToast={showToast}
          onCoins={addCoins}
        />
      )}
      {tab === "game" && game && (
        <LifeGamePanel
          firstName={firstName}
          look={look}
          game={game}
          setGame={setGame}
          onCoins={addCoins}
          onToast={showToast}
          onOpenStudio={() => setStudioOpen(true)}
          funMode={funMode}
          onShare={() => {
            sharePlan.mutate({
              customerId,
              label: `${firstName} · Life Game`,
              userIntent: game.choices.map((c) => c.label).join(" → "),
              onTrack: game.cash >= 0,
              endingBalance: game.cash,
            });
            showToast("Your future and priorities were shared with Jamie ✓");
          }}
        />
      )}
      {tab === "canvas" && funMode && (
        <FutureCanvasPanel
          firstName={firstName}
          tags={tags}
          aum={selected?.aum ?? experience.data?.canvas?.defaultAum ?? 0}
          look={look}
          events={events}
          setEvents={setEvents}
          connections={connections}
          setConnections={setConnections}
          filter={filter}
          setFilter={setFilter}
          onToast={showToast}
        />
      )}

      <AvatarStudio
        open={studioOpen}
        look={look}
        onClose={() => setStudioOpen(false)}
        onChange={persistAvatar}
        onToast={showToast}
      />
      <Toast text={text} />
    </div>
  );
}
