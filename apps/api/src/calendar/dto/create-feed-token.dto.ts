import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** Création d'un jeton d'abonnement iCal (back-office, issue #20). */
export class CreateFeedTokenDto {
  @ApiProperty({ description: "Libellé pour identifier l'usage du jeton.", maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}
