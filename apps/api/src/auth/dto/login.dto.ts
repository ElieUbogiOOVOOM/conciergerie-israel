import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

/** Identifiants de connexion au back-office. */
export class LoginDto {
  @ApiProperty({ example: "admin@hymea.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "••••••••", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
