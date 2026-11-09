import { IsInt, Max, Min } from 'class-validator';
export class CreateInventoryDto { @IsInt() @Min(0) @Max(2147483647) quantity!: number; }
export class AdjustInventoryDto { @IsInt() @Min(-2147483647) @Max(2147483647) delta!: number; }
