import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
export class OrderLineDto {
  @IsUUID() variantId!: string;
  @IsInt() @Min(1) @Max(10000) quantity!: number;
}
export class CreateOrderDto {
  @IsUUID() storeId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}
