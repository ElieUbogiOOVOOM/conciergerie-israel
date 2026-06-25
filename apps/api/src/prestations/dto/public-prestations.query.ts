import { ApiProperty } from "@nestjs/swagger";
import { type TypeClient, typesClient } from "@hymea/shared";
import { IsIn } from "class-validator";

/** Filtre de l'endpoint public : prestations actives pour un type de client. */
export class PublicPrestationsQuery {
  @ApiProperty({ enum: typesClient, example: "particulier" })
  @IsIn(typesClient)
  cible!: TypeClient;
}
