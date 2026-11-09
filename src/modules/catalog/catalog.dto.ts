import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '../../database/entities/product.entity.js';
import { VariantStatus } from '../../database/entities/product-variant.entity.js';
export class CreateProductDto { @IsString() @IsNotEmpty() @MaxLength(200) name!: string; }
export class UpdateProductDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
export class CreateVariantDto {
  @IsString() @IsNotEmpty() @MaxLength(100) sku!: string;
  @IsInt() @Min(0) @Max(2147483647) priceCents!: number;
}
export class UpdateVariantDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) sku?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) priceCents?: number;
  @IsOptional() @IsEnum(VariantStatus) status?: VariantStatus;
}
