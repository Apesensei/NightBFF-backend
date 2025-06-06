import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./repositories/auth.repository";
import { OnfidoService } from "./services/onfido.service";
import { AgeVerificationService } from "./services/age-verification.service";
import { AgeVerificationController } from "./controllers/age-verification.controller";
import { AgeVerificationRepository } from "./repositories/age-verification.repository";
import { AgeVerification } from "./entities/age-verification.entity";
import { User } from "./entities/user.entity";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AgeVerification]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN", "7d"),
        },
      }),
    }),
  ],
  controllers: [AuthController, AgeVerificationController],
  providers: [
    AuthService,
    AuthRepository,
    OnfidoService,
    AgeVerificationService,
    AgeVerificationRepository,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    AuthRepository,
    TypeOrmModule.forFeature([User]),
    JwtModule,
  ],
})
export class AuthModule {}
