import React from 'react';
import Select from 'rc-select';

import './index.css';
import OptionSelect from '@/components/NetworkSelect/Option';
import {EvmVaultConfig} from '@/types';
import IconsLibrary from '@/components/IconsLibrary';
import {EverTokenAssets} from '@/misc/token-assets';

type SelectProps = {
    value: string | undefined;
    onChange: (newValue: string) => void;
    vaults: EvmVaultConfig[];
};

export default function SelectToken(props: SelectProps): JSX.Element {
    const {value, vaults, onChange} = props;
    const ArrowDown = IconsLibrary['arrowDown'];

    return (
        <div className={'token-select-container'}>
            <Select
                prefixCls={'network-select'}
                showSearch={false}
                allowClear={false}
                showArrow={false}
                value={value}
                onChange={onChange}
                placeholder={'Select token'}
                options={vaults.map((v) => {
                    const token = EverTokenAssets.find((t) => t.rootAddress === v.tip3RootAddress);
                    const Icon = () => <img width={20} height={20} src={token?.icon} alt={''} />;
                    return {
                        value: v.tip3RootAddress,
                        label: <OptionSelect icon={<Icon />} text={token?.name || ''} />,
                    };
                })}
            />
            <div className={'token-select-arrow-container'}>
                <ArrowDown />
            </div>
        </div>
    );
}
