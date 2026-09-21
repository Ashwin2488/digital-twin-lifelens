import { useExperience } from "../../shared/api/hooks";
import { HumanCharacter, RoomDecor } from "./HumanAvatar";

export type AvatarProfile = { coins: number; owned: string[]; equipped: string[]; colour: string };

export function AvatarStudio({
  open,
  look,
  onClose,
  onChange,
  onToast,
}: {
  open: boolean;
  look: AvatarProfile;
  onClose: () => void;
  onChange: (next: AvatarProfile) => void;
  onToast: (text: string) => void;
}) {
  const shop = useExperience().data?.avatar?.shop || [];
  if (!open) return null;

  function buyOrEquip(id: string) {
    const item = shop.find((x: { id: string }) => x.id === id);
    if (!item) return;
    if (!look.owned.includes(id)) {
      if (look.coins < item.cost) {
        onToast(`Earn ${item.cost - look.coins} more coins to unlock ${item.name}`);
        return;
      }
      onChange({ ...look, coins: look.coins - item.cost, owned: [...look.owned, id], equipped: [...look.equipped, id] });
      onToast(`${item.name} unlocked!`);
      return;
    }
    onChange({
      ...look,
      equipped: look.equipped.includes(id) ? look.equipped.filter((x) => x !== id) : [...look.equipped, id],
    });
  }

  return (
    <dialog open className="avatar-dialog" onClose={onClose}>
      <div className="dialog-head">
        <div>
          <p className="eyebrow">AVATAR STUDIO</p>
          <h2>Build your Future You</h2>
          <p>Earn coins by completing life chapters. Items are cosmetic and never affect financial outcomes.</p>
        </div>
        <button type="button" onClick={onClose}>×</button>
      </div>
      <div className="avatar-studio-layout">
        <div className="avatar-preview-wrap">
          <div className="room-scene studio-scene">
            <div className="room-window"><i></i></div>
            <RoomDecor equipped={look.equipped} />
            <HumanCharacter look={look} />
          </div>
          <div className="studio-balance"><span>✦</span><strong>{look.coins}</strong> Future Coins</div>
          <div className="colour-picker">
            <span>OUTFIT COLOUR</span>
            {["sky", "mint", "peach", "violet"].map((colour) => (
              <button key={colour} type="button" data-colour={colour} className={look.colour === colour ? "active" : ""} aria-label={colour} onClick={() => onChange({ ...look, colour })} />
            ))}
          </div>
        </div>
        <div>
          <div className="shop-tabs"><button className="active" type="button">All items</button><span>Complete more chapters to unlock rare drops.</span></div>
          <div className="avatar-shop">
            {shop.map((item: { id: string; name: string; cost: number; description: string; icon: string }) => {
              const owned = look.owned.includes(item.id);
              const equipped = look.equipped.includes(item.id);
              return (
                <article key={item.id} className={`shop-item ${equipped ? "equipped" : ""}`}>
                  <b>{item.icon}</b>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                    <span>{owned ? "Owned" : `✦ ${item.cost}`}</span>
                  </div>
                  <button type="button" onClick={() => buyOrEquip(item.id)}>{equipped ? "Equipped ✓" : owned ? "Equip" : "Buy"}</button>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </dialog>
  );
}
