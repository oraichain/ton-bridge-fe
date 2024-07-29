import { toNano } from "@ton/core";

const FWD_AMOUNT = toNano(0.1);
const TON_MESSAGE_VALID_UNTIL = 100000;
const BRIDGE_TON_TO_ORAI_MINIMUM_GAS = toNano(1);
const EXTERNAL_MESSAGE_FEE = toNano(0.01);
const MINIMUM_BRIDGE_PER_USD = 100;

export {
  FWD_AMOUNT,
  TON_MESSAGE_VALID_UNTIL,
  BRIDGE_TON_TO_ORAI_MINIMUM_GAS,
  EXTERNAL_MESSAGE_FEE,
  MINIMUM_BRIDGE_PER_USD,
};
