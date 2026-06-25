import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { type TypeClient, typesClient } from "@hymea/shared";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, Min, ValidateNested } from "class-validator";

import { I18nTextDto } from "./i18n-text.dto";

/** Création d'une prestation (route admin). */
export class CreatePrestationDto {
  @ApiProperty({ type: I18nTextDto })
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  libelle!: I18nTextDto;

  @ApiPropertyOptional({ type: I18nTextDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  description?: I18nTextDto;

  @ApiProperty({ enum: typesClient, example: "particulier" })
  @IsIn(typesClient)
  cible!: TypeClient;

  @ApiProperty({ example: 120, minimum: 1, description: "Durée par défaut, en minutes." })
  @IsInt()
  @Min(1)
  dureeMinutes!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
