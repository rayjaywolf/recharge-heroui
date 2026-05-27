import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("Role", ["ADMIN", "DISTRIBUTOR", "RETAILER"]);
export const txStatusEnum = pgEnum("TxStatus", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);
export const providerEnum = pgEnum("Provider", [
  "A1TOPUP",
  "REALROBO",
  "MROBOTICS",
  "TEST",
]);
export const fundRequestStatusEnum = pgEnum("FundRequestStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    phoneNumber: text("phoneNumber"),
    phoneNumberVerified: boolean("phoneNumberVerified").notNull().default(false),
    image: text("image"),
    role: roleEnum("role").notNull().default("RETAILER"),
    balance: integer("balance").notNull().default(0),
    earnings: doublePrecision("earnings").notNull().default(0),
    isSuspended: boolean("isSuspended").notNull().default(false),
    isApproved: boolean("isApproved").notNull().default(false),
    isRejected: boolean("isRejected").notNull().default(false),
    whatsappNumber: text("whatsappNumber"),
    address: text("address"),
    pincode: text("pincode"),
    state: text("state"),
    aadharNumber: text("aadharNumber"),
    panNumber: text("panNumber"),
    gstNumber: text("gstNumber"),
    businessType: text("businessType"),
    distributorId: text("distributorId"),
    mpinHash: text("mpinHash"),
    mpinMustReset: boolean("mpinMustReset").notNull().default(false),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_email_key").on(table.email),
    uniqueIndex("user_phoneNumber_key").on(table.phoneNumber),
    foreignKey({
      columns: [table.distributorId],
      foreignColumns: [table.id],
      name: "user_distributorId_fkey",
    }),
  ],
);

export const transaction = pgTable(
  "transaction",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetPhone: text("targetPhone").notNull(),
    operator: text("operator").notNull(),
    amount: integer("amount").notNull(),
    circleCode: text("circleCode"),
    provider: providerEnum("provider").notNull().default("REALROBO"),
    status: txStatusEnum("status").notNull().default("PENDING"),
    apiReferenceId: text("apiReferenceId"),
    apiMessage: text("apiMessage"),
    idempotencyKey: text("idempotencyKey"),
    retailerCommission: doublePrecision("retailerCommission").notNull().default(0),
    distributorCommission: doublePrecision("distributorCommission")
      .notNull()
      .default(0),
    adminCommission: doublePrecision("adminCommission").notNull().default(0),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("transaction_userId_idx").on(table.userId),
    index("transaction_status_idx").on(table.status),
    uniqueIndex("transaction_apiReferenceId_key").on(table.apiReferenceId),
    uniqueIndex("transaction_idempotencyKey_key").on(table.idempotencyKey),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { precision: 3, mode: "date" }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_key").on(table.token),
    index("session_userId_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      precision: 3,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      precision: 3,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const commissionRule = pgTable(
  "commission_rule",
  {
    id: text("id").primaryKey(),
    operator: text("operator").notNull(),
    providerMargin: doublePrecision("providerMargin").notNull().default(0),
    adminMargin: doublePrecision("adminMargin").notNull().default(0),
    distributorMargin: doublePrecision("distributorMargin").notNull().default(0),
    retailerMargin: doublePrecision("retailerMargin").notNull().default(0),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("commission_rule_operator_key").on(table.operator)],
);

export const operatorProviderConfig = pgTable(
  "operator_provider_config",
  {
    id: text("id").primaryKey(),
    operator: text("operator").notNull(),
    provider: providerEnum("provider").notNull().default("REALROBO"),
    backupProvider: providerEnum("backupProvider"),
    backupProvider2: providerEnum("backupProvider2"),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("operator_provider_config_operator_key").on(table.operator),
  ],
);

export const fundRequest = pgTable(
  "fund_request",
  {
    id: text("id").primaryKey(),
    retailerId: text("retailerId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    distributorId: text("distributorId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    remarks: text("remarks"),
    status: fundRequestStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("fund_request_retailerId_idx").on(table.retailerId),
    index("fund_request_distributorId_idx").on(table.distributorId),
    index("fund_request_status_idx").on(table.status),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  transactions: many(transaction),
  fundRequestsAsRetailer: many(fundRequest, { relationName: "retailerFundRequests" }),
  fundRequestsAsDistributor: many(fundRequest, {
    relationName: "distributorFundRequests",
  }),
  distributor: one(user, {
    fields: [user.distributorId],
    references: [user.id],
    relationName: "distributorToRetailer",
  }),
  retailers: many(user, { relationName: "distributorToRetailer" }),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  user: one(user, { fields: [transaction.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const fundRequestRelations = relations(fundRequest, ({ one }) => ({
  retailer: one(user, {
    fields: [fundRequest.retailerId],
    references: [user.id],
    relationName: "retailerFundRequests",
  }),
  distributor: one(user, {
    fields: [fundRequest.distributorId],
    references: [user.id],
    relationName: "distributorFundRequests",
  }),
}));

export type User = typeof user.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type Provider = (typeof providerEnum.enumValues)[number];
export type TxStatus = (typeof txStatusEnum.enumValues)[number];
export type FundRequestStatus = (typeof fundRequestStatusEnum.enumValues)[number];
