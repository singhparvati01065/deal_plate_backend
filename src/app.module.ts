import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { PromotionsModule } from './promotions/promotions.module';
import { FavoritesModule } from './favorites/favorites.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { StaffModule } from './staff/staff.module';
import { UploadsModule } from './uploads/uploads.module';
import { MenuModule } from './menu/menu.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DevicesModule } from './devices/devices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    FirebaseModule,
    UsersModule,
    RestaurantsModule,
    PromotionsModule,
    FavoritesModule,
    SubscriptionsModule,
    StaffModule,
    UploadsModule,
    MenuModule,
    CampaignsModule,
    DevicesModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
