import {useEffect, useState} from 'react';
import {TokenAbi} from '@/misc/ever-abi';
import {Address} from 'everscale-inpage-provider';
import {rpc} from '@/providers/EverWalletProvider';
import {useAccountDeployStatus} from '@/providers/EverWalletProvider/hooks/account';

export enum EthEventContractStatus {
    Initializing = '0',
    Pending = '1',
    Confirmed = '2',
    Rejected = '3',
}

type EthEventContractState = {
    isDeployed: boolean | undefined;
    status: undefined | EthEventContractStatus;
};

export const useEthEventContractStatus = (address: string | undefined): EthEventContractState => {
    const deployStatus = useAccountDeployStatus(address);
    const [status, setStatus] = useState<EthEventContractStatus | undefined>(undefined);

    useEffect(
        function () {
            if (deployStatus === true && address) {
                let stale = false;
                // TODO use subscription
                const interval = setInterval(function () {
                    const contract = new rpc.Contract(TokenAbi.TokenTransferEthEvent, new Address(address));
                    contract.methods
                        .getDetails({
                            answerId: 0,
                        })
                        .call()
                        .then(function (answer) {
                            if (!stale) {
                                const status = Object.entries(EthEventContractStatus).find(
                                    ([, value]) => value === answer._status,
                                )?.[1];
                                setStatus(status);
                                if (
                                    status === EthEventContractStatus.Confirmed ||
                                    status === EthEventContractStatus.Rejected
                                ) {
                                    clearInterval(interval);
                                }
                            }
                        });
                }, 10000);
                return () => {
                    stale = true;
                    clearInterval(interval);
                };
            } else {
                setStatus(undefined);
            }
        },
        [deployStatus, address],
    );

    return {
        isDeployed: deployStatus,
        status: status,
    };
};
