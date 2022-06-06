import BigNumber from 'bignumber.js';
import {Address, Contract, TransactionId} from 'everscale-inpage-provider';
import {useCallback, useEffect, useState} from 'react';
import {TokenAbi} from '@/misc/ever-abi';
import {isGoodBignumber} from '@/utils';
import {rpc} from '@/providers/EverWalletProvider';
import {useTokenRootContract} from '@/providers/EverWalletProvider/hooks/tokenRoot';

type TokenWallet = {
    walletBalance: BigNumber;
    burn: (
        amount: string,
        proxy: Address,
        burnValue: string,
        evmAddress: string,
        evmChainId: string,
    ) => Promise<TransactionId>;
};

export function useTokenWallet(
    rootAddress: Address | undefined,
    userAddress: Address | undefined,
): TokenWallet | undefined {
    const rootContract = useTokenRootContract(rootAddress);
    const [contract, setContract] = useState<Contract<typeof TokenAbi.Wallet> | undefined>(undefined);
    const [walletBalance, setWalletBalance] = useState<BigNumber | undefined>(undefined);

    useEffect(
        function () {
            if (rootContract !== undefined && userAddress !== undefined) {
                let stale = false;
                (async () => {
                    const {value0: tokenWalletAddress} = await rootContract.methods
                        .walletOf({
                            answerId: 0,
                            walletOwner: userAddress,
                        })
                        .call();

                    const contract = new rpc.Contract(TokenAbi.Wallet, tokenWalletAddress);

                    const {value0: balance} = await contract.methods
                        .balance({
                            answerId: 0,
                        })
                        .call();

                    if (stale || !isGoodBignumber(balance, false)) return;

                    setContract(contract);
                    setWalletBalance(new BigNumber(balance));
                })();
                return () => {
                    stale = true;
                    setContract(undefined);
                    setWalletBalance(undefined);
                };
            }
        },
        [rootContract],
    );

    const burn = useCallback(
        async function (
            amount: string,
            callBackTo: Address,
            burnValue: string,
            evmAddress: string,
            evmChainId: string,
        ): Promise<TransactionId> {
            if (!contract || !userAddress || !rootContract) {
                throw new Error('Wallet contract not initialized');
            } else {
                const data = await rpc.packIntoCell({
                    data: {
                        addr: evmAddress,
                        chainId: evmChainId,
                    },
                    structure: [
                        {name: 'addr', type: 'uint160'},
                        {name: 'chainId', type: 'uint32'},
                    ] as const,
                });

                const {id} = await contract.methods
                    .burn({
                        callbackTo: callBackTo,
                        payload: data.boc,
                        remainingGasTo: userAddress,
                        amount: amount,
                    })
                    .send({
                        amount: burnValue,
                        bounce: true,
                        from: userAddress,
                    });

                return id;
            }
        },
        [contract, userAddress],
    );

    if (contract && userAddress && walletBalance) {
        return {
            walletBalance,
            burn,
        };
    }
    return undefined;
}
