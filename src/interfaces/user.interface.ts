export interface ICreateUser {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  password: string;
  role: "ADMIN" | "USER";
  createdAt: Date;
  updatedAt: Date;
}
