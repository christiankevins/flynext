export type CartItemType = "hotel" | "flight";

export interface CartEventDetail {
  type: CartItemType;
  id: string;
  name: string;
  city?: string;
}

export const CART_UPDATE_EVENT = "cartUpdate";

export function dispatchCartUpdate(detail: CartEventDetail) {
  const event = new CustomEvent(CART_UPDATE_EVENT, { detail });
  window.dispatchEvent(event);
}
