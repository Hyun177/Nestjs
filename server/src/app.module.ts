import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { ProductModule } from './product/product.module';
import { RoleModule } from './role/role.module';

import { MessageController } from './message/message.controller';
import { MessageModule } from './message/message.module';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { CartModule } from './cart/cart.module';
import { FavoriteModule } from './favorite/favorite.module';
import { VoucherModule } from './voucher/voucher.module';
import { OrderModule } from './order/order.module';
import { ReviewModule } from './review/review.module';
import { PaymentModule } from './payment/payment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LocationModule } from './location/location.module';
import { SellerRequestModule } from './seller-request/seller-request.module';
import { ShopModule } from './shop/shop.module';
import { ShopCategoryModule } from './shop-category/shop-category.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { MailModule } from './mail/mail.module';
import { ContactModule } from './contact/contact.module';

import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CloudinaryModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Lưu ý: Để true để tự động tạo table, nhưng cẩn thận ở môi trường production
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    UsersModule,
    AuthModule,
    PostsModule,
    ProductModule,
    RoleModule,
    MessageModule,
    CategoryModule,
    BrandModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    CartModule,
    FavoriteModule,
    VoucherModule,
    OrderModule,
    ReviewModule,
    PaymentModule,
    DashboardModule,
    LocationModule,
    SellerRequestModule,
    ShopModule,
    ShopCategoryModule,
    NewsletterModule,
    MailModule,
    ContactModule,
  ],
  controllers: [MessageController],
  providers: [],
})
export class AppModule {}
