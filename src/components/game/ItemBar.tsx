import { ITEMS, IN_LEVEL_ITEMS } from '../../data/items';
import { itemAvailable, freeUsesLeft, type SaveData } from '../../save/save';
import type { ItemId } from '../../engine/types';

interface Props {
  save: SaveData;
  onUse: (id: ItemId) => void;
  disabled?: boolean;
}

/**
 * In-level recovery items. Each button shows the item, its remaining count
 * (free uses are marked), and a preview tooltip. Tapping a depleted item
 * routes to a buy prompt handled by the parent.
 */
export function ItemBar({ save, onUse, disabled }: Props) {
  return (
    <div className="item-bar" role="group" aria-label="Recovery items">
      {IN_LEVEL_ITEMS.map((id) => {
        const def = ITEMS[id];
        const count = itemAvailable(save, id);
        const free = freeUsesLeft(save, id);
        return (
          <button
            key={id}
            className={`item-btn ${count === 0 ? 'empty' : ''}`}
            onClick={() => onUse(id)}
            disabled={disabled}
            title={`${def.name} — ${def.effect}`}
            aria-label={`${def.name}: ${def.effect}. ${count} available.`}
          >
            <span className="item-icon">{def.icon}</span>
            <span className={`item-count ${free > 0 ? 'free' : ''}`}>
              {count > 0 ? (free > 0 ? `${count} free` : count) : `🪙${def.price}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
