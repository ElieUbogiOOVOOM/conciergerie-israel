import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { type Locale, locales, type TypeClient, typesClient } from "@hymea/shared";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

/** Demande de RDV depuis le formulaire public (issue #13). */
export class CreateRendezVousDto {
  @ApiProperty({ example: "Cohen" })
  @IsString()
  @MaxLength(120)
  nom!: string;

  @ApiProperty({ example: "David" })
  @IsString()
  @MaxLength(120)
  prenom!: string;

  @ApiProperty({ example: "david.cohen@example.com" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "+972500000000" })
  @IsString()
  @MaxLength(40)
  telephone!: string;

  @ApiProperty({ enum: typesClient, example: "particulier" })
  @IsIn(typesClient)
  typeClient!: TypeClient;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  prestationId!: string;

  @ApiPropertyOptional({
    example: "2026-07-01T09:00:00.000Z",
    description: "Créneau souhaité. Obligatoire pour un particulier.",
  })
  @IsOptional()
  @IsISO8601()
  debut?: string;

  @ApiPropertyOptional({ description: "Obligatoire pour un particulier." })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  surfaceM2?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  nombrePieces?: number;

  @ApiPropertyOptional({ enum: locales, default: "fr" })
  @IsOptional()
  @IsIn(locales)
  locale?: Locale;

  @ApiProperty({ description: "Consentement RGPD : doit valoir true.", example: true })
  @IsBoolean()
  consentement!: boolean;

  @ApiPropertyOptional({ description: "Jeton Cloudflare Turnstile." })
  @IsOptional()
  @IsString()
  turnstileToken?: string;

  /** Champ leurre (honeypot) : doit rester vide ; rempli = bot. */
  @ApiPropertyOptional({ description: "Honeypot anti-bot : ne pas remplir." })
  @IsOptional()
  @IsString()
  website?: string;
}
