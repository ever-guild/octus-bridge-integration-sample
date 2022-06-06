import React from 'react';
import './index.scss';
import {truncateDecimals} from '@/utils';

type AmountInputProps = {
    value: string;
    decimals: number;
    label?: string;
    readonly: boolean;
    onChange?: (newValue: string) => void;
};

export default function AmountInput(props: AmountInputProps): JSX.Element {
    const onBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
        const {value} = event.target;
        if (value.length === 0) {
            return;
        }
        const validatedAmount = truncateDecimals(value, props.decimals);
        if (props.value !== validatedAmount && validatedAmount != null) {
            props.onChange?.(validatedAmount);
        } else if (validatedAmount === null) {
            props.onChange?.('0');
        }
    };

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        let {value} = event.target;
        if (
            props.value &&
            value.length > props.value.length &&
            props.value.indexOf('.') > -1 &&
            value.charAt(value.length - 1) === '.'
        ) {
            return;
        }
        value = value.replace(/,/g, '.');
        value = value.replace(/[.]+/g, '.');
        value = value.replace(/(?!- )[^0-9.]/g, '');
        props.onChange?.(value);
    };

    return (
        <div className={'simple-amount-input-container'}>
            {props.label && <span className={'simple-amount-input-label'}>{props.label}</span>}
            <input
                type={'text'}
                className={'simple-amount-input'}
                value={props.value}
                onBlur={onBlur}
                onChange={onChange}
                readOnly={props.readonly}
            />
        </div>
    );
}
