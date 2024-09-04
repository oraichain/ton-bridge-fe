"use client";

import { Environment } from "@/constants/ton";
import { MANIFEST_URL } from "@/constants/config";
import { useLoadTonBalance } from "@/hooks/useLoadToken";
import { useAuthTonAddress } from "@/stores/authentication/selector";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";

export const TonProvider = (props: React.PropsWithChildren<{}>) => {
  const tonAddress = useAuthTonAddress();

  const { loadAllBalanceTonToken } = useLoadTonBalance({
    tonAddress,
    tonNetwork: Environment.Mainnet,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      {props.children}
    </TonConnectUIProvider>
  );
};
