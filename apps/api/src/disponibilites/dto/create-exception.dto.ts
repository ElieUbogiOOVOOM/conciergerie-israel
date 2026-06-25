import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

/** Exception / blocage de disponibilité sur une plage de dates. */
export class CreateExceptionDto {
  @ApiProperty({ example: "2026-07-14T00:00:00.000Z" })
  @IsISO8601()
  debut!: string;

  @ApiProperty({ example: "2026-07-15T00:00:00.000Z" })
  @IsISO8601()
  fin!: string;

  @ApiPropertyOptional({ default: true, description: "true = fermé/bloqué." })
  @IsOptional()
  @IsBoolean()
  bloque?: boolean;

  @ApiPropertyOptional({ example: "Jour férié" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motif?: string;
}
