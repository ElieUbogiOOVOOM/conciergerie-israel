import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, ValidateIf } from "class-validator";

/** Attribution (ou retrait) d'un intervenant sur un RDV (issue #15). */
export class AssignIntervenantDto {
  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description: "Intervenant à assigner, ou null pour retirer l'attribution.",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  intervenantId!: string | null;
}
