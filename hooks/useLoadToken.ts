"use client";

import {
  cosmosTokens,
  oraichainTokens,
  tokenMap,
} from "@/constants/bridgeTokens";
import { chainInfos } from "@/constants/chainInfo";
import { Environment } from "@/constants/ton";
import { TON_ZERO_ADDRESS, TonTokensContract } from "@/constants/contract";
import { getNetworkConfig } from "@/constants/networks";
import {
  OsmosisTokenDenom,
  OsmosisTokenList,
  TonTokenList,
} from "@/constants/tokens";
import {
  genAddressCosmos,
  getTonClient,
  handleCheckWallet,
  retryOrbs,
} from "@/helper";
import { useAmountsCache, useTokenActions } from "@/stores/token/selector";
import { fromBinary, toBinary } from "@cosmjs/cosmwasm-stargate";
import { StargateClient } from "@cosmjs/stargate";
import { MulticallQueryClient } from "@oraichain/common-contracts-sdk";
import { OraiswapTokenTypes } from "@oraichain/oraidex-contracts-sdk";
import { useEffect } from "react";
import { toDisplay } from "@oraichain/oraidex-common";
import { JettonMinter, JettonWallet } from "@oraichain/ton-bridge-contracts";
import { Address } from "@ton/core";
import { TonClient } from "@ton/ton";

const env = process.env.NEXT_PUBLIC_ENV as Environment;
async function loadNativeBalance(
  dispatch: (amount: AmountDetails) => void,
  address: string,
  tokenInfo: { chainId: string; rpc: string }
) {
  if (!address) return;
  try {
    const client = await StargateClient.connect(tokenInfo.rpc);
    const amountAll = await client.getAllBalances(address);
    console.log("amountAll", amountAll);

    let amountDetails: AmountDetails = {};
    console.log("oraichainTokens", oraichainTokens);

    // reset native balances
    [...cosmosTokens, ...OsmosisTokenList(env)]
      .filter((t) => t.chainId === tokenInfo.chainId && !t.contractAddress)
      .forEach((t) => {
        amountDetails[t.denom] = "0";
      });

    const tokensAmount = amountAll
      .filter(
        (coin) =>
          tokenMap[coin.denom] ||
          [...Object.values(OsmosisTokenDenom[env])].includes(coin.denom)
      )
      .map((coin) => [coin.denom, coin.amount]);
    Object.assign(amountDetails, Object.fromEntries(tokensAmount));

    dispatch(amountDetails);
  } catch (ex) {
    console.trace("error");
    console.log(ex);
  }
}

async function loadCw20Balance(
  dispatch: (amount: AmountDetails) => void,
  address: string
) {
  if (!address) return;

  // get all cw20 token contract
  const cw20Tokens = [...[...oraichainTokens].filter((t) => t.contractAddress)];

  const data = toBinary({
    balance: { address },
  });

  const multicall = new MulticallQueryClient(
    window.client,
    getNetworkConfig(env).multicall
  );

  const res = await multicall.aggregate({
    queries: cw20Tokens.map((t) => ({
      address: t.contractAddress,
      data,
    })),
  });

  const amountDetails = Object.fromEntries(
    cw20Tokens.map((t, ind) => {
      if (!res.return_data[ind].success) {
        return [t.denom, 0];
      }
      const balanceRes = fromBinary(
        res.return_data[ind].data
      ) as OraiswapTokenTypes.BalanceResponse;
      const amount = balanceRes.balance;
      return [t.denom, amount];
    })
  );

  dispatch(amountDetails);

  return amountDetails;
}

async function loadCw20BalanceWithSpecificTokens(
  dispatch: (amount: AmountDetails) => void,
  address: string,
  specificTokens: string[]
) {
  if (!address) return;

  // get all cw20 token contract
  const cw20Tokens = [
    ...[
      ...oraichainTokens,
      // {
      //   name: "Ton",
      //   symbol: "TON",
      //   contractAddress: CW20_TON_CONTRACT,
      //   denom: "cw20_ton",
      //   coingeckoId: "the-open-network",
      //   decimal: 9,
      // },
    ].filter(
      (t) => t.contractAddress && specificTokens.includes(t.contractAddress)
    ),
  ];

  const data = toBinary({
    balance: { address },
  });

  const multicall = new MulticallQueryClient(
    window.client,
    getNetworkConfig(env).multicall
  );

  const res = await multicall.aggregate({
    queries: cw20Tokens.map((t) => ({
      address: t.contractAddress,
      data,
    })),
  });

  const amountDetails = Object.fromEntries(
    cw20Tokens.map((t, ind) => {
      if (!res.return_data[ind].success) {
        return [t.denom, 0];
      }
      const balanceRes = fromBinary(
        res.return_data[ind].data
      ) as OraiswapTokenTypes.BalanceResponse;
      const amount = balanceRes.balance;
      return [t.denom, amount];
    })
  );

  dispatch(amountDetails);

  return amountDetails;
}

export const useLoadTonBalance = ({
  tonAddress,
  tonNetwork = Environment.Mainnet,
}: {
  tonAddress: string;
  tonNetwork?: Environment;
  // address: string
}) => {
  const { handleSetTonAmountsCache } = useTokenActions();

  const loadBalanceByToken = async (address?: string) => {
    try {
      // get the decentralized RPC endpoint
      const client = await getTonClient();
      if (address === TON_ZERO_ADDRESS) {
        const balance = await client.getBalance(Address.parse(tonAddress));

        handleSetTonAmountsCache({
          ["native_ton"]: toDisplay(balance || "0").toString(),
        });
        return {
          balance: balance,
          jettonWalletAddress: TON_ZERO_ADDRESS,
        };
      }

      const token = TonTokenList(tonNetwork).find(
        (e) => e.contractAddress === address
      );

      const jettonMinter = JettonMinter.createFromAddress(
        Address.parse(address)
      );
      const jettonMinterContract = client.open(jettonMinter);
      const jettonWalletAddress = await jettonMinterContract.getWalletAddress(
        Address.parse(tonAddress)
      );
      const jettonWallet = JettonWallet.createFromAddress(jettonWalletAddress);
      const jettonWalletContract = client.open(jettonWallet);
      const balance = await jettonWalletContract.getBalance();

      handleSetTonAmountsCache({
        [token.denom]: toDisplay(balance.amount || "0").toString(),
      });
      return {
        balance: balance.amount,
        jettonWalletAddress,
      };
    } catch (error) {
      console.log("error load ton balance", error);
      return {};
    }
  };

  const loadAllBalanceTonToken = async () => {
    if (!tonAddress) return;

    const allTokens = Object.values(TonTokensContract[tonNetwork]);
    const client = await getTonClient();

    const fullData = await Promise.all(
      allTokens.map(async (item) => {
        return retryOrbs(async () => {
          if (item === TON_ZERO_ADDRESS) {
            // native token: TON
            const balance = await client.getBalance(Address.parse(tonAddress));

            return {
              balance: balance,
              jettonWalletAddress: TON_ZERO_ADDRESS,
              token: item,
            };
          }
          const jettonMinter = JettonMinter.createFromAddress(
            Address.parse(item)
          );

          const jettonMinterContract = client.open(jettonMinter);

          const jettonWalletAddress =
            await jettonMinterContract.getWalletAddress(
              Address.parse(tonAddress)
            );

          // console.log("294-jettonWalletAddress", jettonWalletAddress);
          const jettonWallet =
            JettonWallet.createFromAddress(jettonWalletAddress);
          const jettonWalletContract = client.open(jettonWallet);
          const balance = await jettonWalletContract.getBalance();

          return {
            balance: balance.amount,
            jettonWalletAddress,
            token: item,
          };
        });
      })
    );

    let amountDetail: AmountDetails = {};
    fullData?.map((data) => {
      const token = TonTokenList(tonNetwork).find(
        (e) => e.contractAddress === data.token
      );

      amountDetail = {
        ...amountDetail,
        [token?.denom]: (data.balance || "0").toString(),
      };
    });

    handleSetTonAmountsCache(amountDetail);
  };

  // @dev: this function will changed based on token minter address (which is USDT, USDC, bla bla bla)
  useEffect(() => {
    try {
      if (tonAddress) {
        loadAllBalanceTonToken();
      }
    } catch (error) {
      console.log("error :>> loadAllBalanceTonToken", error);
    }
  }, [tonAddress, tonNetwork]);

  return {
    loadBalanceByToken,
    loadAllBalanceTonToken,
  };
};

const loadTonBalance = (
  dispatch: (amount: AmountDetails) => void,
  address: string,
  tonNetwork: Environment = Environment.Mainnet
) => {
  return {};
};

export const useLoadToken = () => {
  const amounts = useAmountsCache();
  const { handleSetAmountsCache, handleSetTonAmountsCache } = useTokenActions();

  const loadToken = ({
    oraiAddress,
    cosmosAddress,
  }: // tonAddress,
  {
    oraiAddress?: string;
    cosmosAddress?: string;
  }) => {
    if (oraiAddress) {
      loadNativeBalance(
        (amounts) => handleSetAmountsCache(amounts),
        oraiAddress,
        {
          chainId: getNetworkConfig(env).chainId,
          rpc: getNetworkConfig(env).rpc,
        }
      );
      loadCw20Balance((amounts) => handleSetAmountsCache(amounts), oraiAddress);
    }

    if (cosmosAddress) {
      const cosmosInfos = chainInfos.filter(
        (chainInfo) => chainInfo.chainId === "osmosis-1"
      );

      for (const chainInfo of cosmosInfos) {
        console.log("chainInfo", chainInfo);

        loadNativeBalance(
          (amounts) => handleSetAmountsCache(amounts),
          cosmosAddress,
          chainInfo
        );
      }
    }
  };

  return {
    loadToken,
  };
};
