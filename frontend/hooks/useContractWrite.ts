import { useState, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useChainId, useSwitchChain, useWriteContract } from "wagmi";
import { celoSepolia } from "@/lib/wagmi";

interface UseContractWriteOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook to handle contract writes with chain switching
 */
export function useContractWrite(options?: UseContractWriteOptions) {
  const { isConnected } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const write = useCallback(
    async (
      address: `0x${string}`,
      abi: any,
      functionName: string,
      args: any[],
      value?: bigint,
    ) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      // Check and switch network if needed
      if (chainId !== celoSepolia.id) {
        setIsWrongNetwork(true);
        try {
          await switchChainAsync({ chainId: celoSepolia.id });
          setIsWrongNetwork(false);
        } catch (err) {
          throw new Error("Failed to switch network");
        }
      }

      try {
        writeContract({
          address,
          abi,
          functionName,
          args,
          ...(value && { value }),
        });
        options?.onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        options?.onError?.(error);
        throw error;
      }
    },
    [isConnected, chainId, switchChainAsync, writeContract, options],
  );

  return {
    write,
    hash,
    isPending,
    error,
    isWrongNetwork,
    reset,
  };
}
