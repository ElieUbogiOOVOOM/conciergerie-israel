import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** Création d'une équipe d'intervenants (route admin). */
export class CreateEquipeDto {
  @ApiProperty({ example: "Équipe Tel-Aviv", minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nom!: string;
}
