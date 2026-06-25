import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * Contenu éditorial décliné dans les 3 langues (FR/EN/HE).
 * Validé en DTO imbriqué → les 3 clés sont obligatoires et non vides.
 */
export class I18nTextDto {
  @ApiProperty({ example: "Nettoyage premium" })
  @IsString()
  @IsNotEmpty()
  fr!: string;

  @ApiProperty({ example: "Premium cleaning" })
  @IsString()
  @IsNotEmpty()
  en!: string;

  @ApiProperty({ example: "ניקיון פרימיום" })
  @IsString()
  @IsNotEmpty()
  he!: string;
}
