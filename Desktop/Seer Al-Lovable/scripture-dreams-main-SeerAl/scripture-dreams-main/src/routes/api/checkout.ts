import { createFileRoute } from "@tanstack/react-router";
import { CANONICAL_PLANS, FIELD_GUIDE_CONFIG, PlanKey } from "@/config/plans";

type Tier = PlanKey | "field_guide";

// Map funnel tier → live Shopify product (Storefront GID).
const PRODUCT_GID: Record<Tier, string> = {
  trial: CANONICAL_PLANS.trial.productGid,
  seeker_monthly: CANONICAL_PLANS.seeker_monthly.productGid,
  watchman_monthly: CANONICAL_PLANS.watchman_monthly.productGid,
  watchman_annual: CANONICAL_PLANS.watchman_annual.productGid,
  prophets_circle: CANONICAL_PLANS.prophets_circle.productGid,
  impartation: CANONICAL_PLANS.impartation.productGid,
  field_guide: FIELD_GUIDE_CONFIG.productGid,
};

const SHOPIFY_DOMAIN = "seer-9389.myshopify.com";
const SHOPIFY_STOREFRONT_TOKEN = "93b99b66cd039d390128cc2cd6346790";
const SHOPIFY_API_VERSION = "2025-07";
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

const CONFIGURATION_ERROR = "Checkout is not configured yet for this plan.";

function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (v as string) in PRODUCT_GID;
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function storefront<T = unknown>(query: string, variables: Record<string, unknown>) {
  const res = await fetch(STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Shopify ${res.status}`);
  }
  return (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
}

const PRODUCT_VARIANT_QUERY = `
  query ProductVariant($id: ID!) {
    product(id: $id) {
      id
      variants(first: 1) {
        edges { node { id availableForSale } }
      }
    }
  }
`;

const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message }
    }
  }
`;

function withOnlineStoreChannel(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("channel", "online_store");
    return u.toString();
  } catch {
    return url;
  }
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const data = (body ?? {}) as Record<string, unknown>;
        const tier = data.tier;
        const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
        const email = typeof data.email === "string" ? data.email.trim() : "";
        const phone = typeof data.phone === "string" ? data.phone.trim() : "";
        const bumpFieldGuide = data.bumpFieldGuide === true;
        const attribution =
          data.attribution && typeof data.attribution === "object"
            ? (data.attribution as Record<string, string>)
            : {};

        if (!isTier(tier)) {
          return Response.json({ error: "Unknown plan." }, { status: 400 });
        }
        if (firstName.length < 2 || firstName.length > 100) {
          return Response.json({ error: "Invalid first name." }, { status: 400 });
        }
        if (!isEmail(email) || email.length > 255) {
          return Response.json({ error: "Invalid email." }, { status: 400 });
        }

        const productGid = PRODUCT_GID[tier];

        try {
          // 1) Look up the first variant of the main product live.
          const lookup = await storefront<{
            product: {
              variants: { edges: Array<{ node: { id: string; availableForSale: boolean } }> };
            } | null;
          }>(PRODUCT_VARIANT_QUERY, { id: productGid });

          const variantId = lookup.data?.product?.variants?.edges?.[0]?.node?.id;
          if (!variantId) {
            return Response.json({ error: CONFIGURATION_ERROR }, { status: 503 });
          }

          const lines: Array<{ quantity: number; merchandiseId: string }> = [
            { quantity: 1, merchandiseId: variantId },
          ];

          // Optional order bump: Watchman's Field Guide.
          if (bumpFieldGuide && tier !== "field_guide") {
            try {
              const bump = await storefront<{
                product: { variants: { edges: Array<{ node: { id: string } }> } } | null;
              }>(PRODUCT_VARIANT_QUERY, { id: PRODUCT_GID.field_guide });
              const bumpVariant = bump.data?.product?.variants?.edges?.[0]?.node?.id;
              if (bumpVariant) lines.push({ quantity: 1, merchandiseId: bumpVariant });
            } catch (e) {
              console.error("bump lookup failed", e);
            }
          }

          // 2) Build cart attributes (preserve attribution + tier).
          const attributes: Array<{ key: string; value: string }> = [
            { key: "lead_source", value: "seer_ai_bridge" },
            { key: "tier", value: tier },
            { key: "first_name", value: firstName },
          ];
          if (phone) attributes.push({ key: "phone", value: phone.slice(0, 40) });
          if (bumpFieldGuide) attributes.push({ key: "order_bump", value: "field_guide" });
          for (const [k, v] of Object.entries(attribution)) {
            if (typeof v === "string" && v.length > 0 && v.length <= 200) {
              attributes.push({ key: k.slice(0, 60), value: v });
            }
          }

          // 3) Create cart via Storefront API.
          const cart = await storefront<{
            cartCreate: {
              cart: { id: string; checkoutUrl: string } | null;
              userErrors: Array<{ field: string[] | null; message: string }>;
            };
          }>(CART_CREATE_MUTATION, {
            input: {
              lines,
              buyerIdentity: { email },
              attributes,
            },
          });

          const userErrors = cart.data?.cartCreate?.userErrors ?? [];
          if (userErrors.length > 0) {
            console.error("cartCreate errors", userErrors);
            return Response.json({ error: CONFIGURATION_ERROR }, { status: 503 });
          }

          const checkoutUrl = cart.data?.cartCreate?.cart?.checkoutUrl;
          if (!checkoutUrl) {
            return Response.json({ error: CONFIGURATION_ERROR }, { status: 503 });
          }

          return Response.json({ url: withOnlineStoreChannel(checkoutUrl) });
        } catch (err) {
          console.error("checkout error", err);
          return Response.json({ error: CONFIGURATION_ERROR }, { status: 503 });
        }
      },
    },
  },
});
