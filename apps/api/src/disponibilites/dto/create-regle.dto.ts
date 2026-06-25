import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Matches, Max, Min } from "class-validator";

/** Règle d'ouverture hebdomadaire (un créneau d'ouverture pour un jour donné). */
export class CreateRegleDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: "0 = dimanche … 6 = samedi." })
  @IsInt()
  @Min(0)
  @Max(6)
  jour!: number;

  @ApiProperty({ example: "09:00", description: "Heure d'ouverture (HH:mm)." })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "debut doit être au format HH:mm." })
  debut!: string;

  @ApiProperty({ example: "18:00", description: "Heure de fermeture (HH:mm)." })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "fin doit être au format HH:mm." })
  fin!: string;
}
