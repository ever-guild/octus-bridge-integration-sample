import React from 'react';
import Select from 'rc-select';

import './index.css';
import OptionSelect from '@/components/NetworkSelect/Option';
import {ChainId, NetworkShape} from '@/types';
import IconsLibrary from '@/components/IconsLibrary';

type SelectProps = {
    value: string | undefined;
    onChange: (newValue: ChainId) => void;
    networks: NetworkShape[];
    placeholder: string
};

export default function SelectNetwork(props: SelectProps): JSX.Element {
    const {value, networks, placeholder, onChange} = props;
    const ArrowDown = IconsLibrary['arrowDown'];

    return (
        <div className={'network-select-container'}>
            <Select
                prefixCls={'network-select'}
                showSearch={false}
                allowClear={false}
                showArrow={false}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                options={networks.map((v) => {
                    const Icon = IconsLibrary[v.currencySymbol];
                    return {
                        value: v.id,
                        label: <OptionSelect icon={<Icon />} text={v.label} />,
                    };
                })}
            />
            <div className={'network-select-arrow-container'}>
                <ArrowDown />
            </div>
        </div>
    );
}
