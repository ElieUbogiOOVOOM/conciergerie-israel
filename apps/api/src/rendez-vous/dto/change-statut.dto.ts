import { ApiProperty } from "@nestjs/swagger";
import { type StatutRendezVous, statutsRendezVous } from "@hymea/shared";
import { IsIn } from "class-validator";

/** Changement de statut d'un RDV (transitions contrôlées, issue #15). */
export class ChangeStatutDto {
  @ApiProperty({ enum: statutsRendezVous })
  @IsIn(statutsRendezVous)
  statut!: StatutRendezVous;
}
