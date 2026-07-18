import { useEffect } from 'react';
import { telemetry } from '../../telemetry/telemetry';
import { SUPPLY_PRODUCTS, SHOP_LIVE } from '../../data/shop';

interface Props {
  onClose: () => void;
}

/**
 * The Piggy Supply Cart — a preview storefront only. Purchases are disabled
 * (SHOP_LIVE is false and no billing exists), so the buy buttons are inert and
 * clearly labelled. Every pig remains earnable through play; nothing here is
 * required for the story or the ending.
 */
export function SupplyCart({ onClose }: Props) {
  useEffect(() => {
    telemetry.log('supply_cart_opened');
  }, []);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog supply-cart" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 2 }}>🛒 Piggy Supply Cart</h2>
        <p className="supply-note">
          Preview only — purchases aren’t available. Every piggy can always be rescued for free by playing.
        </p>

        <div className="supply-list">
          {SUPPLY_PRODUCTS.map((p) => (
            <div key={p.id} className="supply-item" onMouseEnter={() => telemetry.log('supply_product_viewed')}>
              <span className="supply-icon" aria-hidden="true">{p.icon}</span>
              <div className="supply-body">
                <b>{p.name}</b>
                <small>{p.blurb}</small>
                <ul>{p.contents.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
              <button
                className="btn btn--ghost btn--sm supply-buy"
                disabled
                onClick={() => { /* no billing exists — intentionally inert */ }}
                title="Purchases are not available in this build"
              >
                {SHOP_LIVE ? p.mockPrice : 'Soon'}
              </button>
            </div>
          ))}
        </div>

        <button className="btn btn--primary btn--block" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
