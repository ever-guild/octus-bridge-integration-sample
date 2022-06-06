import React, {useState} from 'react';
import {TransferRoute} from '@/providers/BridgeStepProvider';

import './index.scss';
import SelectEvmEverscale from './SelectEvmEverscale';
import SelectEverscaleEvm from './SelectEverscaleEvm';

// Just select scenario and then select token to transfer

export default function Page(): JSX.Element {
    const [transferRoute, setTransferRoute] = useState<TransferRoute | undefined>(undefined);

    const buttons = [
        {
            text: 'Evm to Everscale',
            value: TransferRoute.EvmEverscale,
        },
        {
            text: 'Everscale to Evm',
            value: TransferRoute.EverscaleEvm,
        },
        // not supported
        // {
        //     text: 'Evm to Evm',
        //     value: TransferRoute.EvmEvm,
        // },
    ];

    return (
        <div className={'page-centered-parent-container'}>
            {(() => {
                switch (transferRoute) {
                    case undefined:
                        return (
                            <div className={'select-network-and-asset-page-container'}>
                                <h4>Simple bridge example</h4>
                                {buttons.map((b) => (
                                    <div
                                        key={b.value}
                                        className={
                                            'material-like-button display-block text-center margin-top-bottom-10'
                                        }
                                        onClick={() => {
                                            setTransferRoute(b.value);
                                        }}>
                                        {b.text}
                                    </div>
                                ))}
                            </div>
                        );
                    case TransferRoute.EvmEverscale:
                        return <SelectEvmEverscale />;
                    case TransferRoute.EverscaleEvm:
                        return <SelectEverscaleEvm />;
                    default:
                        return <div className={'select-network-and-asset-page-container'}>Not realized by now.</div>;
                }
            })()}
        </div>
    );
}
