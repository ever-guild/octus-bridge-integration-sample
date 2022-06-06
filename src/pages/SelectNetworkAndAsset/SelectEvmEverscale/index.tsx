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

export default function SelectEvmEverscale(): JSX.Element {
    const {setStep: setBridgeStepState} = useContext(BridgeStepContext);
    const [sourceNetworkId, setSourceNetworkId] = useState<ChainId | undefined>(undefined);
    const [selectedTokenTip3Root, setSelectedTokenTip3Root] = useState<string | undefined>(undefined);
    const [vaultsAvailableInTargetNetwork, setVaultsAvailableInTargetNetwork] = useState<EvmVaultConfig[]>([]);
    const [useCreditProcessorValue, setUseCreditProcessorValue] = useState<boolean>(false);

    useEffect(
        function () {
            setSelectedTokenTip3Root(undefined);
            if (sourceNetworkId !== undefined) {
                const knownVaultsForThisNetwork = EvmVaults.filter(
                    (v) =>
                        v.chainId === GetNetworkShapeById(sourceNetworkId)?.chainId &&
                        v.depositType === 'default' &&
                        // We have metadata for this tip3 root
                        EverTokenAssets.find((t) => t.rootAddress === v.tip3RootAddress),
                );
                setVaultsAvailableInTargetNetwork(knownVaultsForThisNetwork);
            }
        },
        [sourceNetworkId],
    );

    return (
        <div className={'select-network-and-asset-evm-to-everscale-page-container'}>
            <NetworkSelect
                placeholder={'Select source evm network'}
                onChange={setSourceNetworkId}
                networks={Networks.filter((n) => n.type === 'evm')}
                value={sourceNetworkId}
            />
            {sourceNetworkId !== undefined && (
                <div className={'select-network-and-asset-evm-to-everscale-page-token-select-container'}>
                    <TokenSelect
                        onChange={setSelectedTokenTip3Root}
                        vaults={vaultsAvailableInTargetNetwork}
                        value={selectedTokenTip3Root}
                    />
                </div>
            )}
            {sourceNetworkId !== undefined && (
                <div className={'margin-top-bottom-10'}>
                    <label className="switch">
                        <input
                            type="checkbox"
                            value={useCreditProcessorValue.toString()}
                            onChange={(e) => setUseCreditProcessorValue(e.target.value === 'false')}
                        />
                        <span className="slider round" />
                    </label>
                    &nbsp;Use credit processor
                </div>
            )}
            {sourceNetworkId !== undefined && selectedTokenTip3Root !== undefined && (
                <div
                    onClick={() => {
                        const vault = vaultsAvailableInTargetNetwork.find(
                            (v) => v.tip3RootAddress === selectedTokenTip3Root && v.depositType === 'default',
                        );
                        if (vault) {
                            setBridgeStepState({
                                step: BridgeStep.Prepare,
                                route: TransferRoute.EvmEverscale,
                                sourceNetworkId: sourceNetworkId,
                                destinationNetworkId: 'everscale-1',
                                vaultEvmAddress: vault.vaultEvmAddress,
                                type: useCreditProcessorValue ? TransferType.Credit : TransferType.Default,
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
