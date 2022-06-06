import BigNumber from 'bignumber.js';
import {Address, Contract} from 'everscale-inpage-provider';
import {EthEventVoteData, EverWalletConnectionStatus} from '@/types';
import {useEffect, useMemo, useState} from 'react';
import {TokenAbi} from '@/misc/ever-abi';
import {isGoodBignumber} from '@/utils';
import {CreditFactoryAddress, rpc, useEverWallet} from '@/providers/EverWalletProvider';

type CreditFactoryContract = {
    fee: BigNumber;
    deriveCreditProcessorAddress: (configurationAddress: Address, eventVoteData: EthEventVoteData) => Promise<string>;
};

export const useCreditFactory = function (): CreditFactoryContract | undefined {
    const {connectionStatus} = useEverWallet();
    const [fee, setFee] = useState<BigNumber | undefined>(undefined);
    const [contract, setContract] = useState<Contract<typeof TokenAbi.CreditFactory> | undefined>(undefined);

    useEffect(
        function () {
            if (connectionStatus === EverWalletConnectionStatus.Ok) {
                setContract(new rpc.Contract(TokenAbi.CreditFactory, CreditFactoryAddress));
            }
            return () => {
                setContract(undefined);
            };
        },
        [connectionStatus],
    );

    useEffect(() => {
        let stale = false;
        if (contract !== undefined) {
            (async () => {
                const {fee: factoryFee} = (
                    await contract.methods
                        .getDetails({
                            answerId: 0,
                        })
                        .call()
                ).value0;

                if (isGoodBignumber(factoryFee, false) && !stale) {
                    setFee(new BigNumber(factoryFee));
                }
            })();
        }
        return () => {
            stale = true;
            setFee(undefined);
        };
    }, [contract]);

    const deriveCreditProcessorAddress = useMemo(() => {
        return async (configurationAddress: Address, eventVoteData: EthEventVoteData) => {
            if (contract === undefined) return Promise.reject(new Error('Contract not initialized'));
            return (
                await contract.methods
                    .getCreditProcessorAddress({
                        answerId: 0,
                        eventVoteData,
                        configuration: configurationAddress,
                    })
                    .call()
            ).value0.toString();
        };
    }, [contract]);

    if (contract === undefined || fee === undefined) {
        return undefined;
    } else {
        return {
            fee,
            deriveCreditProcessorAddress,
        };
    }
};
