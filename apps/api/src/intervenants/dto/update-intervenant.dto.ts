import { PartialType } from "@nestjs/swagger";

import { CreateIntervenantDto } from "./create-intervenant.dto";

/** Mise à jour partielle d'un intervenant (tous les champs optionnels). */
export class UpdateIntervenantDto extends PartialType(CreateIntervenantDto) {}
