type AvatarLook = { colour?: string; equipped?: string[] };

export function HumanCharacter({
  look,
  stressed,
  happy,
  level,
  className = "game-character human-character",
}: {
  look?: AvatarLook;
  stressed?: boolean;
  happy?: boolean;
  level?: number | string;
  className?: string;
}) {
  const equipped = new Set(look?.equipped || []);
  const mood = stressed ? "character-stressed" : happy ? "character-happy" : "";
  return (
    <div className={`${className} ${mood}`.trim()} data-colour={look?.colour || "sky"}>
      <span className="avatar-hat" hidden={!equipped.has("cap")}>⌒</span>
      <span className="human-hair"></span>
      <span className="human-head">
        <i className="avatar-glasses" hidden={!equipped.has("glasses")}>○—○</i>
        <b className="character-eyes">• •</b>
        <em className="character-mouth">{happy ? "⌣" : stressed ? "︵" : "—"}</em>
      </span>
      <span className="human-torso"></span>
      <span className="human-arm left"></span>
      <span className="human-arm right"></span>
      <span className="human-leg left"></span>
      <span className="human-leg right"></span>
      {level != null ? <b>{level}</b> : null}
    </div>
  );
}

export function RoomDecor({ equipped = [] as string[] }) {
  const has = (id: string) => equipped.includes(id);
  return (
    <>
      <div className="room-plant" hidden={!has("plant")}>♧</div>
      <div className="avatar-pet" hidden={!has("pet")}>●ᴥ●</div>
      <div className="avatar-lamp" hidden={!has("lamp")}>◉</div>
    </>
  );
}
