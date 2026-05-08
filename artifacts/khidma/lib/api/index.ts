/**
 * Public API barrel for Khidma. UI components must import from here, never
 * call Supabase directly.
 */
export * as authApi from "./auth";
export * as profilesApi from "./profiles";
export * as servicesApi from "./services";
export * as ordersApi from "./orders";
export * as quotesApi from "./quotes";
export * as chatApi from "./chat";
export * as notificationsApi from "./notifications";
export type { DbNotification } from "./notifications";
export * as walletApi from "./wallet";
export * as reviewsApi from "./reviews";
export * as supportApi from "./support";

export {
  serviceToUi,
  uiServiceToInsert,
  orderToUi,
  uiOrderStatusToDb,
  dbOrderStatusToUi,
  messageToUi,
  conversationToThread,
  walletTxToTransaction,
  profileToUser,
} from "./mappers";

export type {
  DbProfile,
  DbService,
  DbOrder,
  DbConversation,
  DbMessage,
  DbWalletTx,
} from "./mappers";
