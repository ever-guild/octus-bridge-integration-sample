import BigNumber from 'bignumber.js';

export function isGoodBignumber(value: BigNumber | number | string, nonZeroCheck = true): boolean {
    const valueBN = value instanceof BigNumber ? value : new BigNumber(value);
    return valueBN.isFinite() && !valueBN.isNaN() && valueBN.isPositive() && (nonZeroCheck ? !valueBN.isZero() : true);
}

export function truncateDecimals(value: string, decimals?: number): string | undefined {
    const result = new BigNumber(value || 0);

    if (!isGoodBignumber(result)) {
        return value;
    }

    if (decimals !== undefined && result.decimalPlaces() > decimals) {
        return result.dp(decimals, BigNumber.ROUND_DOWN).toFixed();
    }

    return result.toFixed();
}

export function formatTokenValue(value: BigNumber | undefined, decimals: number | undefined) {
    if (value === undefined || decimals === undefined) {
        return '';
    }
    const str = value.shiftedBy(-1 * decimals).toFixed(2, BigNumber.ROUND_DOWN);
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
