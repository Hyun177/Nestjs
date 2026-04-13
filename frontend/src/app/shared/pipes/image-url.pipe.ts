import { Pipe, PipeTransform } from '@angular/core';
import { ImageService } from '../../core/services/image.service';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  constructor(private imageService: ImageService) {}

  transform(imagePath: string | null | undefined): string {
    return this.imageService.getImageUrl(imagePath);
  }
}