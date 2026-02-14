export interface License {
  _id?: ObjectId;
  key: string;
  name: string;
  status: "active" | "revoked";
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}