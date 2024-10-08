import { TON_ZERO_ADDRESS, TonInteractionContract } from "@/constants/contract";
import { TonTokenList } from "@/constants/tokens";
import { Environment } from "@/constants/ton";
import { getTonClient, retryOrbs } from "@/helper";
import { useTokenActions } from "@/stores/token/selector";
import { JettonMinter } from "@oraichain/ton-bridge-contracts";
import { Address, TonClient } from "@ton/ton";
import { useEffect } from "react";

// dev: use to load wallet jetton address of bridge adapter
export const useLoadWalletsTon = ({
  tonNetwork = Environment.Mainnet,
}: {
  tonNetwork?: Environment;
}) => {
  const { handleSetWalletsTonCache } = useTokenActions();

  const loadWalletsTon = async () => {
    let tokenOnTons = TonTokenList(tonNetwork);

    let walletsTon = {};
    for (const tokenOnTon of tokenOnTons) {
      if (tokenOnTon.contractAddress == TON_ZERO_ADDRESS) {
        walletsTon = {
          ...walletsTon,
          [tokenOnTon.denom]: TON_ZERO_ADDRESS,
        };
        continue;
      }

      await retryOrbs(async () => {
        const client = await getTonClient();

        const jettonMinter = JettonMinter.createFromAddress(
          Address.parse(tokenOnTon.contractAddress)
        );
        const jettonMinterContract = client.open(jettonMinter);
        const jettonWalletAddress = await jettonMinterContract.getWalletAddress(
          Address.parse(TonInteractionContract[tonNetwork].bridgeAdapter)
        );
        walletsTon = {
          ...walletsTon,
          [tokenOnTon.denom]: jettonWalletAddress.toString(),
        };
      });
    }
    handleSetWalletsTonCache(walletsTon);
  };

  useEffect(() => {
    loadWalletsTon();
  }, [tonNetwork]);

  return {
    loadWalletsTon,
  };
};
