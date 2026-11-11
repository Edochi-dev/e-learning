import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Datos de la verificación pública de un certificado.
 *
 * Se exige el nombre además del número porque el número es correlativo
 * (MR-00001, MR-00002…) y recorrerlo permitía cosechar los nombres de las
 * alumnas y sus cursos. Pedir el nombre cierra esa puerta sin tocar nada de
 * lo ya emitido: quien tiene el certificado delante lo lee en él, y quien solo
 * adivina números no puede pasar. Lo que se querría obtener es justo lo que
 * hace falta tener para entrar.
 */
export class LookupCertificateDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de certificado es obligatorio' })
  @MaxLength(50)
  number: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del titular es obligatorio' })
  @MaxLength(200)
  name: string;
}
