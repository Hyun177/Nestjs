import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'vndCurrency',
  standalone: true
})
export class VndCurrencyPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) return '';
    
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(amount)) return '';

    return amount.toLocaleString('vi-VN') + ' VNĐ';
  }
}
