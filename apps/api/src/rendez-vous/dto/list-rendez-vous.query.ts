import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  type StatutRendezVous,
  statutsRendezVous,
  type TypeClient,
  typesClient,
} from "@hymea/shared";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Filtres + pagination + recherche de la liste RDV (back-office, issue #15). */
export class ListRendezVousQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ enum: statutsRendezVous })
  @IsOptional()
  @IsIn(statutsRendezVous)
  statut?: StatutRendezVous;

  @ApiPropertyOptional({ enum: typesClient })
  @IsOptional()
  @IsIn(typesClient)
  typeClient?: TypeClient;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  prestationId?: string;

  @ApiPropertyOptional({
    description: "Borne basse sur le créneau (ISO).",
    example: "2026-07-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "Borne haute sur le créneau (ISO).",
    example: "2026-07-31T23:59:59.000Z",
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Recherche par nom, prénom ou email du client." })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
