import {useEffect, useState} from 'react';
import {TokenAbi} from '@/misc/ever-abi';
import {Address} from 'everscale-inpage-provider';
import {rpc} from '@/providers/EverWalletProvider';
import {useAccountDeployStatus} from '@/providers/EverWalletProvider/hooks/account';

export enum CreditProcessorContractStatus {
    Created = '0',
    EventNotDeployed = '1',
    EventDeployInProgress = '2',
    EventConfirmed = '3',
    EventRejected = '4',
    CheckingAmount = '5',
    CalculateSwap = '6',
    SwapInProgress = '7',
    SwapFailed = '8',
    SwapUnknown = '9',
    UnwrapInProgress = '10',
    UnwrapFailed = '11',
    ProcessRequiresGas = '12',
    Processed = '13',
    Cancelled = '14',
}

type CreditProcessorContractState =
    | {
          isDeployed: false;
          status: undefined;
      }
    | {
          isDeployed: true;
          status: CreditProcessorContractStatus;
      };

export const useCreditProcessorContractStatus = (address: string | undefined): CreditProcessorContractState => {
    const deployStatus = useAccountDeployStatus(address);
    const [status, setStatus] = useState<CreditProcessorContractStatus | undefined>(undefined);

    useEffect(
        function () {
            if (deployStatus === true && address) {
                let stale = false;
                // TODO use subscription
                const refresh = (): void => {
                    const contract = new rpc.Contract(TokenAbi.CreditProcessor, new Address(address));
                    contract.methods
                        .getDetails({
                            answerId: 0,
                        })
                        .call()
                        .then(function ({value0: {state}}) {
                            if (!stale) {
                                const newStatus = Object.entries(CreditProcessorContractStatus).find(
                                    ([, value]) => value === state,
                                )?.[1];
                                setStatus(newStatus);
                                if (
                                    newStatus &&
                                    [
                                        CreditProcessorContractStatus.EventRejected,
                                        CreditProcessorContractStatus.SwapFailed,
                                        CreditProcessorContractStatus.SwapUnknown,
                                        CreditProcessorContractStatus.UnwrapFailed,
                                        CreditProcessorContractStatus.ProcessRequiresGas,
                                        CreditProcessorContractStatus.Processed,
                                        CreditProcessorContractStatus.Cancelled,
                                    ].includes(newStatus)
                                ) {
                                    clearInterval(interval);
                                }
                            }
                        });
                };
                const interval = setInterval(refresh, 10000);
                refresh();
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

    if (status === undefined) {
        return {
            isDeployed: false,
            status: status,
        };
    } else {
        return {
            isDeployed: true,
            status: status,
        };
    }
};
