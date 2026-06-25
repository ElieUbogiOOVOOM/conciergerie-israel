import { PartialType } from "@nestjs/swagger";

import { CreateEquipeDto } from "./create-equipe.dto";

/** Mise à jour partielle d'une équipe. */
export class UpdateEquipeDto extends PartialType(CreateEquipeDto) {}
