import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** Création d'un intervenant terrain (route admin). */
export class CreateIntervenantDto {
  @ApiProperty({ example: "Cohen", minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nom!: string;

  @ApiPropertyOptional({ example: "Sarah", nullable: true, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  prenom?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, description: "Équipe de rattachement." })
  @IsOptional()
  @IsUUID()
  equipeId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
