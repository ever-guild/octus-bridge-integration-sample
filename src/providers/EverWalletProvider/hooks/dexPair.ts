import BigNumber from 'bignumber.js';
import {useEffect, useState} from 'react';
import {EverWalletConnectionStatus} from '@/types';
import {isGoodBignumber} from '@/utils';
import {Address} from 'everscale-inpage-provider';
import {DexAbi} from '@/misc/ever-abi';
import {rpc, useEverWallet, WEVERRootAddress} from '@/providers/EverWalletProvider';
import {useDexRootContract} from '@/providers/EverWalletProvider/hooks/dexRoot';

export const useDexPairExpectedAmount = function (
    fromToken: string,
    toToken: string,
    nanoAmount: BigNumber,
): BigNumber {
    const {connectionStatus} = useEverWallet();
    const dexRootContract = useDexRootContract();
    const [expectedAmount, setExpectedAmount] = useState<BigNumber>(new BigNumber(0));

    useEffect(
        function () {
            let stale = false;
            if (
                connectionStatus === EverWalletConnectionStatus.Ok &&
                isGoodBignumber(nanoAmount) &&
                dexRootContract !== undefined
            ) {
                (async () => {
                    // just to avoid ddos on input
                    await new Promise((resolve) => setTimeout(resolve, 3000));

                    if (stale) return;

                    const {value0: pairAddress} = await dexRootContract.methods
                        .getExpectedPairAddress({
                            answerId: 0,
                            left_root: new Address(fromToken),
                            right_root: new Address(toToken),
                        })
                        .call({});

                    if (stale) return;

                    const pairContract = new rpc.Contract(DexAbi.Pair, pairAddress);
                    const {value0: isActive} = await pairContract.methods
                        .isActive({
                            answerId: 0,
                        })
                        .call();

                    if (stale || !isActive) return;

                    const expectedAmount = (
                        await pairContract.methods
                            .expectedSpendAmount({
                                answerId: 0,
                                receive_amount: nanoAmount.toFixed(),
                                receive_token_root: WEVERRootAddress,
                            })
                            .call()
                    ).expected_amount;

                    if (isGoodBignumber(expectedAmount) && !stale) {
                        setExpectedAmount(new BigNumber(expectedAmount));
                    }
                })();
            }
            return () => {
                stale = true;
                setExpectedAmount(new BigNumber(0));
            };
        },
        [connectionStatus, dexRootContract, fromToken, toToken, nanoAmount],
    );

    return expectedAmount;
};
