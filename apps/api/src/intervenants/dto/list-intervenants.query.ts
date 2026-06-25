import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

/** Filtre optionnel de la liste des intervenants (back-office). */
export class ListIntervenantsQuery {
  @ApiPropertyOptional({ description: "Ne retourner que les intervenants actifs/inactifs." })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  })
  @IsBoolean()
  actif?: boolean;
}
