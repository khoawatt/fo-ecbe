export interface ApiResponse<T>{success:boolean;statusCode:number;data?:T;error?:{code:string;message:string};}
