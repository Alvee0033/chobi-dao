import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { parseEnv } from "./config/env";
import { AppController } from "./app.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { EventsModule } from "./modules/events/events.module";
import { UploadModule } from "./modules/upload/upload.module";
import { SearchModule } from "./modules/search/search.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { BillingModule } from "./modules/billing/billing.module";

const env = parseEnv();
void env;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    EventsModule,
    UploadModule,
    SearchModule,
    AnalyticsModule,
    BillingModule
  ],
  controllers: [AppController]
})
export class AppModule {}
