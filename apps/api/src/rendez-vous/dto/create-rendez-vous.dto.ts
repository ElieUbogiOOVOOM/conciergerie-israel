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
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/** Interdit les caractères de contrôle (CR/LF/DEL…) → anti-injection en-tête email & ligne CSV. */
// eslint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\u0000-\u001F\u007F]*$/;

/** Demande de RDV depuis le formulaire public (issue #13). */
export class CreateRendezVousDto {
  @ApiProperty({ example: "Cohen" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(NO_CONTROL_CHARS, { message: "nom : caractères de contrôle interdits." })
  nom!: string;

  @ApiProperty({ example: "David" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(NO_CONTROL_CHARS, { message: "prenom : caractères de contrôle interdits." })
  prenom!: string;

  @ApiProperty({ example: "david.cohen@example.com" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "+972500000000" })
  @IsString()
  @Matches(/^\+?[0-9 .\-()]{7,20}$/, { message: "telephone : format invalide." })
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
  @IsISO8601({ strict: true })
  debut?: string;

  @ApiPropertyOptional({ description: "Obligatoire pour un particulier." })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(NO_CONTROL_CHARS, { message: "adresse : caractères de contrôle interdits." })
  adresse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  surfaceM2?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
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
