import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'urlEncode',
  standalone: true
})
export class UrlEncodePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return encodeURIComponent(value);
  }
}
