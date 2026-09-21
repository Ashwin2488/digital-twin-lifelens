import { money } from "../../shared/ui/format";
import { useExperience } from "../../shared/api/hooks";
import { applyGameChoice, gameAchievements, gameScore, newGame, resourceAnswer, rewindTo, type GameCatalog, type GameState } from "./gameEngine";
import { HumanCharacter, RoomDecor } from "./HumanAvatar";

function formatEffects(e: Record<string, number | undefined>) {
  const parts: string[] = [];
  if (e.cash) parts.push(`${e.cash > 0 ? "+" : ""}${money.format(e.cash)} cash`);
  if (e.debt) parts.push(`+${money.format(e.debt)} debt`);
  if (e.happy) parts.push(`${e.happy > 0 ? "+" : ""}${e.happy} wellbeing`);
  if (e.stress) parts.push(`${e.stress > 0 ? "+" : ""}${e.stress} stress`);
  if (e.protection) parts.push(`${e.protection > 0 ? "+" : ""}${e.protection} protection`);
  return parts.slice(0, 2).join(" · ");
}

function gameResultChart(values: number[]) {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${20 + i * (460 / Math.max(1, values.length - 1))},${125 - ((v - min) / range) * 95}`).join(" ");
  return (
    <svg viewBox="0 0 500 150" role="img" aria-label="Cash buffer through the year">
      <line x1="20" y1="125" x2="480" y2="125" stroke="var(--line)" />
      <polyline points={pts} fill="none" stroke="var(--sc-brand-blue)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={20 + i * (460 / Math.max(1, values.length - 1))} cy={125 - ((v - min) / range) * 95} r="4" fill="white" stroke="var(--sc-brand-blue)" strokeWidth="3" />
      ))}
    </svg>
  );
}

type Look = { coins: number; owned: string[]; equipped: string[]; colour: string };

export function LifeGamePanel({
  firstName,
  look,
  game,
  setGame,
  onCoins,
  onToast,
  onShare,
  onOpenStudio,
  funMode,
}: {
  firstName: string;
  look: Look;
  game: GameState;
  setGame: (g: GameState) => void;
  onCoins: (delta: number) => void;
  onToast: (text: string) => void;
  onShare: () => void;
  onOpenStudio: () => void;
  funMode: boolean;
}) {
  const experience = useExperience();
  const catalog = experience.data?.game as GameCatalog | undefined;
  const rounds = catalog?.rounds || [];
  const round = rounds[game.round];
  const last = game.choices.at(-1);

  if (!catalog) return <p className="lab-empty">Loading Life Game catalog…</p>;

  function choose(choiceIndex: number) {
    const { game: next, coinsEarned } = applyGameChoice(catalog, game, choiceIndex);
    setGame(next);
    onCoins(coinsEarned);
  }

  function openResource(id: "twin" | "guide" | "rm") {
    if (id === "twin" && game.resourceOpen !== "twin") {
      if (game.consults <= 0) {
        onToast("You have used both Future You consultations this run");
        return;
      }
      setGame({ ...game, consults: game.consults - 1, resourceOpen: id });
      return;
    }
    setGame({ ...game, resourceOpen: id });
  }

  function rewind(choicePosition: number) {
    const { game: next } = rewindTo(catalog, game, choicePosition);
    setGame(next);
    onToast(`Rewound to Month ${rounds[choicePosition].month} · choose a different path`);
  }

  const score = gameScore(game);
  const personaRow = (experience.data.game.personas || []).find((row: { minScore: number }) => score >= row.minScore)
    || { title: "Future You", copy: "You made it through the year." };
  const persona = [personaRow.title, personaRow.copy];

  return (
    <div className="experience-panel active">
      <section className="play-hero">
        <div>
          <span className="play-kicker">✦ 12 MONTHS TO FUTURE YOU</span>
          <h2>Can you build a family-ready future?</h2>
          <p>Six decisions. Two surprises. One future shaped by you.</p>
        </div>
        <div className="play-profile">
          <div className="hero-human-avatar" aria-hidden="true">
            <HumanCharacter look={look} level={Math.min(6, game.round + 1)} />
          </div>
          <div className="play-profile-copy">
            <small>YOUR DIGITAL TWIN</small>
            <strong>{firstName}</strong>
            <span>{game.complete ? "Year completed" : `Month ${round?.month || 12} · Future Builder`}</span>
          </div>
          {funMode && (
            <button type="button" className="avatar-studio-button" onClick={onOpenStudio}>
              Customize avatar
            </button>
          )}
        </div>
      </section>

      <section className="game-hud" aria-label="Current game resources">
        <div>
          <span>AVAILABLE CASH</span>
          <strong>{money.format(game.cash)}</strong>
          <small>{game.cash >= 0 ? "available buffer" : "buffer exhausted"}</small>
        </div>
        <div>
          <span>DEBT</span>
          <strong>{money.format(game.debt)}</strong>
          <small>keep it manageable</small>
        </div>
        <div className="meter-stat">
          <span>WELLBEING</span>
          <strong>{game.happy}</strong>
          <div><i style={{ width: `${game.happy}%` }} /></div>
        </div>
        <div className="meter-stat">
          <span>STRESS</span>
          <strong>{game.stress}</strong>
          <div className="stress-track"><i style={{ width: `${game.stress}%` }} /></div>
        </div>
        <div className="meter-stat">
          <span>PROTECTION</span>
          <strong>{game.protection}</strong>
          <div><i style={{ width: `${game.protection}%` }} /></div>
        </div>
        <div className="coin-stat">
          <span>FUTURE COINS</span>
          <strong>{look.coins}</strong>
          <small>spend in Avatar Studio</small>
        </div>
      </section>

      <div className="story-layout">
        <aside className="story-map card">
          <p className="eyebrow">YOUR YEAR</p>
          <div className="month-path">
            {rounds.map((r, i) => (
              <div key={r.month} className={`month-node ${i < game.round ? "done" : i === game.round && !game.complete ? "active" : ""}`}>
                <b>{i < game.round ? "✓" : r.icon}</b>
                <span><strong>Month {r.month}</strong><small>{r.title}</small></span>
              </div>
            ))}
          </div>
          <div className="game-objective">
            <span>MISSION</span>
            <strong>Finish Month 12 with</strong>
            <ul><li>6-month cash buffer</li><li>Never go negative</li><li>Stay on a real goal path</li></ul>
          </div>
        </aside>

        <main className="story-stage card">
          {game.rewindMode ? (
            <div>
              <div className="rewind-head">
                <span>↶</span>
                <div>
                  <p className="eyebrow">REWIND THE FUTURE</p>
                  <h2>Which decision would you change?</h2>
                </div>
              </div>
              <div className="rewind-list">
                {game.choices.map((c, i) => (
                  <button key={i} type="button" onClick={() => rewind(i)}>
                    <b>Month {rounds[c.round].month}</b>
                    <span><strong>{rounds[c.round].title}</strong><small>You chose: {c.label}</small></span>
                    <em>Change →</em>
                  </button>
                ))}
              </div>
            </div>
          ) : game.complete ? (
            <GameResults catalog={catalog} unmanagedPath={experience.data.game.unmanagedPath} illustration={experience.data.game.resultsIllustration} firstName={firstName} game={game} score={score} persona={persona} onRewind={() => setGame({ ...game, rewindMode: true })} onRestart={() => setGame(newGame(catalog.start))} onShare={onShare} />
          ) : (
            <div>
              <div className="round-progress">
                <span>DECISION {game.round + 1} OF {rounds.length}</span>
                <div><i style={{ width: `${(game.round / rounds.length) * 100}%` }} /></div>
                <b>Month {round.month}</b>
              </div>
              <div className={`event-banner ${round.kind.includes("SURPRISE") ? "surprise" : ""}`}>
                <span>{round.icon}</span>
                <div><small>{round.kind}</small><h2>{round.title}</h2></div>
              </div>
              <p className="event-story">{round.story}</p>
              <div className="decision-support">
                <div className="support-head">
                  <span>NEED HELP DECIDING?</span>
                  <small>Resources inform your choice—they do not choose for you.</small>
                </div>
                <div className="support-actions">
                  {catalog.resources.map((r: { id: "twin" | "guide" | "rm"; icon: string; title: string; copy: string; limited?: boolean }) => (
                    <button key={r.id} type="button" onClick={() => openResource(r.id)}>
                      <b>{r.icon}</b>
                      <span>
                        <strong>{r.title}</strong>
                        <small>{r.limited ? `${game.consults} consultation${game.consults === 1 ? "" : "s"} left` : r.copy}</small>
                      </span>
                    </button>
                  ))}
                </div>
                {game.resourceOpen && (
                  <div className="resource-answer">
                    {resourceAnswer(catalog, game.resourceOpen, round, game)}
                    {game.resourceOpen === "rm" && (
                      <button type="button" className="resource-rm-link" onClick={() => onToast("Question saved for Jamie · no meeting requested yet")}>Save this for my RM</button>
                    )}
                  </div>
                )}
              </div>
              <div className="story-choices">
                {round.choices.map((c, i) => (
                  <button key={c.tag} type="button" onClick={() => choose(i)}>
                    <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                    <span><strong>{c.label}</strong><small>{c.detail}</small></span>
                    <span className="choice-preview">{formatEffects(c.effects)}</span>
                  </button>
                ))}
              </div>
              <p className="choice-note">There is no perfect answer. Choose what matters most to you.</p>
            </div>
          )}
        </main>

        <aside className="twin-room card">
          <div className={`room-scene ${game.stress >= 60 ? "room-stressed" : ""} ${game.cash > 2500 && game.stress < 55 ? "room-thriving" : ""}`}>
            <div className="room-window"><i></i></div>
            <RoomDecor equipped={look.equipped} />
            <div className="room-bills" style={{ opacity: Math.min(0.95, 0.15 + game.debt / 3500) }}>BILLS</div>
            <div className="room-shield" style={{ opacity: game.protection / 100 }}>◇</div>
            <HumanCharacter look={look} stressed={game.stress >= 60} happy={game.happy >= 78} />
            <div className="room-label">{game.complete ? "Month 12 · Your future is here" : `Month ${round?.month || 1} · ${round?.kind || "Future"}`}</div>
          </div>
          <div className="twin-says">
            <span>FUTURE {firstName.toUpperCase()} SAYS</span>
            <p>“{last?.reaction || "I’m counting on the choices you make today."}”</p>
          </div>
          <div className="decision-log">
            <p className="eyebrow">YOUR DECISIONS</p>
            <div>
              {game.choices.length ? game.choices.slice(-4).reverse().map((c) => (
                <div key={`${c.round}-${c.tag}`}><b>M{rounds[c.round].month}</b><span>{c.label}</span></div>
              )) : <small>No decisions yet.</small>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function GameResults({
  catalog,
  unmanagedPath,
  illustration,
  firstName,
  game,
  score,
  persona,
  onRewind,
  onRestart,
  onShare,
}: {
  catalog: GameCatalog;
  unmanagedPath: number[];
  illustration: { conservative: { cash: number; stress: number; protection: number }; optimised: { cash: number; stress: number; protectionFloor: number; cashFloor: number } };
  firstName: string;
  game: GameState;
  score: number;
  persona: string[];
  onRewind: () => void;
  onRestart: () => void;
  onShare: () => void;
}) {
  const ignored = unmanagedPath;
  const uplift = game.cash - ignored[ignored.length - 1];
  const achievements = gameAchievements(catalog, game);
  const current = { cash: Math.round(game.cash), stress: game.stress, protection: game.protection };
  const conservative = {
    cash: Math.round(game.cash + illustration.conservative.cash),
    stress: Math.min(100, game.stress + illustration.conservative.stress),
    protection: Math.max(10, game.protection + illustration.conservative.protection),
  };
  const optimised = {
    cash: Math.round(Math.max(game.cash + illustration.optimised.cash, illustration.optimised.cashFloor)),
    stress: Math.max(18, game.stress + illustration.optimised.stress),
    protection: Math.max(illustration.optimised.protectionFloor, game.protection),
  };
  return (
    <div>
      <div className="results-celebrate">
        <span>YEAR COMPLETE · +{game.earnedCoins} FUTURE COINS</span>
        <h2>Meet Future {firstName}.</h2>
        <p>{persona[1]}</p>
      </div>
      <div className="result-score">
        <div className="score-orbit"><strong>{score}</strong><span>FUTURE SCORE</span></div>
        <div>
          <p className="eyebrow">YOUR FINANCIAL PERSONALITY</p>
          <h2>{persona[0]}</h2>
          <p>Ending cash <b>{money.format(game.cash)}</b> · Debt <b>{money.format(game.debt)}</b> · Protection <b>{game.protection}/100</b></p>
        </div>
      </div>
      <div className="scenario-comparison">
        <div className="comparison-head"><p className="eyebrow">THREE POSSIBLE FUTURES</p><h3>Same life event. Different levels of support.</h3></div>
        <div className="comparison-grid">
          <div><span>CONSERVATIVE</span><strong>{money.format(conservative.cash)}</strong><small>Stress {conservative.stress} · Protection {conservative.protection}</small><i style={{ width: `${Math.max(5, conservative.protection)}%` }} /></div>
          <div className="current"><span>YOUR CURRENT PATH</span><strong>{money.format(current.cash)}</strong><small>Stress {current.stress} · Protection {current.protection}</small><i style={{ width: `${Math.max(5, current.protection)}%` }} /></div>
          <div className="optimised"><span>OPTIMISED SUPPORT</span><strong>{money.format(optimised.cash)}</strong><small>Stress {optimised.stress} · Protection {optimised.protection}</small><i style={{ width: `${Math.max(5, optimised.protection)}%` }} /></div>
        </div>
        <p className="comparison-note">Illustrative—not a promise or credit decision.</p>
      </div>
      <div className="result-chart">
        <div><p className="eyebrow">THE FUTURE YOU CREATED</p><h3>{uplift >= 0 ? "+" : ""}{money.format(uplift)} vs unmanaged path</h3></div>
        {gameResultChart(game.history)}
      </div>
      <div className="achievement-grid">
        {achievements.map(([icon, title, copy]) => (
          <div key={title}><b>{icon}</b><span><strong>{title}</strong><small>{copy}</small></span></div>
        ))}
      </div>
      <div className="result-actions">
        <button type="button" className="secondary-button" onClick={onRewind}>↶ Rewind one decision</button>
        <button type="button" className="primary-button" onClick={onShare}>Share this future with Jamie</button>
        <button type="button" className="text-button" onClick={onRestart}>Play again</button>
      </div>
    </div>
  );
}
