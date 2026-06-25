import { PartialType } from "@nestjs/swagger";

import { CreatePrestationDto } from "./create-prestation.dto";

/** Mise à jour partielle d'une prestation (tous les champs optionnels). */
export class UpdatePrestationDto extends PartialType(CreatePrestationDto) {}
