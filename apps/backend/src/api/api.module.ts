import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BrandsModule } from './brands/brands.module';
import { ContentModule } from './content/content.module';
import { ScheduleModule } from './schedule/schedule.module';
import { InstagramModule } from './instagram/instagram.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    BrandsModule,
    ContentModule,
    ScheduleModule,
    InstagramModule,
    GatewayModule,
  ],
})
export class ApiModule {}
