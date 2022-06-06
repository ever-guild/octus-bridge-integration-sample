import React, {useContext} from 'react';
import {GetNetworkShapeById, Networks} from '@/misc/networks';

import NetworkSelect from '@/components/NetworkSelect';
import {useEffect, useState} from 'react';
import {ChainId, EvmVaultConfig} from '@/types';
import {EvmVaults} from '@/misc/vaults';
import TokenSelect from '@/components/TokenSelect';
import {EverTokenAssets} from '@/misc/token-assets';

import './index.scss';
import {BridgeStep, BridgeStepContext, TransferRoute, TransferType} from '@/providers/BridgeStepProvider';

export default function SelectEverscaleEvm(): JSX.Element {
    const {setStep: setBridgeStepState} = useContext(BridgeStepContext);

    const [targetNetworkId, setTargetNetworkId] = useState<ChainId | undefined>(undefined);
    const [selectedTokenTip3Root, setSelectedTokenTip3Root] = useState<string | undefined>(undefined);
    const [vaultsAvailableInTargetNetwork, setVaultsAvailableInTargetNetwork] = useState<EvmVaultConfig[]>([]);

    useEffect(
        function () {
            setSelectedTokenTip3Root(undefined);
            if (targetNetworkId !== undefined) {
                const knownVaultsForThisNetwork = EvmVaults.filter(
                    (v) =>
                        v.chainId === GetNetworkShapeById(targetNetworkId)?.chainId &&
                        v.depositType === 'default' &&
                        // We have metadata for this tip3 root
                        EverTokenAssets.find((t) => t.rootAddress === v.tip3RootAddress),
                );
                setVaultsAvailableInTargetNetwork(knownVaultsForThisNetwork);
            }
        },
        [targetNetworkId],
    );

    return (
        <div className={'select-network-and-asset-evm-to-everscale-page-container'}>
            <NetworkSelect
                placeholder={'Select target evm network'}
                onChange={setTargetNetworkId}
                networks={Networks.filter((n) => n.type === 'evm')}
                value={targetNetworkId}
            />
            {targetNetworkId !== undefined && (
                <div className={'select-network-and-asset-evm-to-everscale-page-token-select-container'}>
                    <TokenSelect
                        onChange={setSelectedTokenTip3Root}
                        vaults={vaultsAvailableInTargetNetwork}
                        value={selectedTokenTip3Root}
                    />
                </div>
            )}
            {targetNetworkId !== undefined && selectedTokenTip3Root !== undefined && (
                <div
                    onClick={() => {
                        const vault = vaultsAvailableInTargetNetwork.find(
                            (v) => v.tip3RootAddress === selectedTokenTip3Root && v.depositType === 'default',
                        );
                        if (vault) {
                            setBridgeStepState({
                                step: BridgeStep.Prepare,
                                route: TransferRoute.EverscaleEvm,
                                sourceNetworkId: 'everscale-1',
                                destinationNetworkId: targetNetworkId,
                                vaultEvmAddress: vault.vaultEvmAddress,
                                type: TransferType.Default,
                            });
                        }
                    }}
                    className={'material-like-button margin-top-bottom-10'}>
                    Next
                </div>
            )}
        </div>
    );
}
