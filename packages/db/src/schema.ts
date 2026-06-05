import { relations, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  numeric,
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
export const accountStatusEnum = pgEnum("AccountStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);
export const disputeStatusEnum = pgEnum("DisputeStatus", ["PENDING", "RESOLVED"]);
export const operatorLookupCache = pgTable(
  "operator_lookup_cache",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    payload: text("payload").notNull(),
    fetchedAt: timestamp("fetchedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expiresAt", { precision: 3, mode: "date" }).notNull(),
  },
  (table) => [uniqueIndex("operator_lookup_cache_phone_key").on(table.phone)],
);

export const rechargePlanCache = pgTable(
  "recharge_plan_cache",
  {
    id: text("id").primaryKey(),
    planapiOperatorCode: text("planapiOperatorCode").notNull(),
    planapiCircleCode: text("planapiCircleCode").notNull(),
    operatorLabel: text("operatorLabel").notNull(),
    circleLabel: text("circleLabel").notNull(),
    payload: text("payload").notNull(),
    fetchedAt: timestamp("fetchedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expiresAt", { precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("recharge_plan_cache_operator_circle_key").on(
      table.planapiOperatorCode,
      table.planapiCircleCode,
    ),
  ],
);

export const retailerTopAmountsCache = pgTable(
  "retailer_top_amounts_cache",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    operator: text("operator").notNull(),
    amounts: text("amounts").notNull(),
    fetchedAt: timestamp("fetchedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expiresAt", { precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("retailer_top_amounts_cache_user_operator_key").on(
      table.userId,
      table.operator,
    ),
  ],
);

export const notificationTypeEnum = pgEnum("NotificationType", [
  "RETAILER_PENDING_APPROVAL",
  "DISPUTE_PENDING",
  "RETAILER_APPROVED",
  "RETAILER_REJECTED",
  "RETAILER_SUSPENDED",
  "RETAILER_RESTORED",
  "DISTRIBUTOR_DISPUTE_PENDING",
  "DISTRIBUTOR_DISPUTE_RESOLVED",
  "FUND_REQUEST_PENDING",
  "WALLET_CREDITED",
  "WALLET_DEBITED",
  "RECHARGE_SUCCEEDED",
  "RECHARGE_FAILED",
  "RECHARGE_REFUNDED",
  "ACCOUNT_APPROVED",
  "ACCOUNT_REJECTED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_RESTORED",
  "FUND_REQUEST_APPROVED",
  "FUND_REQUEST_REJECTED",
  "RETAILER_DISPUTE_RESOLVED",
]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    emailVerified: boolean("emailVerified").notNull().default(false),
    phoneNumber: text("phoneNumber"),
    phoneNumberVerified: boolean("phoneNumberVerified").notNull().default(false),
    image: text("image"),
    role: roleEnum("role").notNull().default("RETAILER"),
    balance: integer("balance").notNull().default(0),
    earnings: numeric("earnings", { precision: 10, scale: 2, mode: "number" })
      .notNull()
      .default("0"),
    accountStatus: accountStatusEnum("accountStatus").notNull().default("PENDING"),
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
    retailerCommission: numeric("retailerCommission", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default("0"),
    distributorCommission: numeric("distributorCommission", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default("0"),
    adminCommission: numeric("adminCommission", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default("0"),
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
    providerMargin: numeric("providerMargin", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default("0"),
    adminMargin: numeric("adminMargin", { precision: 10, scale: 2, mode: "number" })
      .notNull()
      .default("0"),
    distributorMargin: numeric("distributorMargin", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default("0"),
    retailerMargin: numeric("retailerMargin", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default("0"),
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

export const dispute = pgTable(
  "dispute",
  {
    id: text("id").primaryKey(),
    distributorId: text("distributorId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    transactionId: text("transactionId")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: disputeStatusEnum("status").notNull().default("PENDING"),
    adminNote: text("adminNote"),
    resolvedBy: text("resolvedBy"),
    resolvedAt: timestamp("resolvedAt", { precision: 3, mode: "date" }),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("dispute_distributorId_idx").on(table.distributorId),
    index("dispute_transactionId_idx").on(table.transactionId),
    index("dispute_status_idx").on(table.status),
    index("dispute_resolvedBy_idx").on(table.resolvedBy),
    uniqueIndex("dispute_transactionId_pending_key")
      .on(table.transactionId)
      .where(sql`status = 'PENDING'`),
    foreignKey({
      columns: [table.resolvedBy],
      foreignColumns: [user.id],
      name: "dispute_resolvedBy_fkey",
    }),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href").notNull(),
    entityId: text("entityId").notNull(),
    readAt: timestamp("readAt", { precision: 3, mode: "date" }),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notification_userId_idx").on(table.userId),
    index("notification_userId_readAt_idx").on(table.userId, table.readAt),
    index("notification_type_entityId_idx").on(table.type, table.entityId),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  transactions: many(transaction),
  notifications: many(notification),
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
  disputes: many(dispute, { relationName: "distributorDisputes" }),
  resolvedDisputes: many(dispute, { relationName: "disputeResolvedByAdmin" }),
}));

export const transactionRelations = relations(transaction, ({ many, one }) => ({
  user: one(user, { fields: [transaction.userId], references: [user.id] }),
  disputes: many(dispute),
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

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
}));

export const disputeRelations = relations(dispute, ({ one }) => ({
  distributor: one(user, {
    fields: [dispute.distributorId],
    references: [user.id],
    relationName: "distributorDisputes",
  }),
  transaction: one(transaction, {
    fields: [dispute.transactionId],
    references: [transaction.id],
  }),
  resolver: one(user, {
    fields: [dispute.resolvedBy],
    references: [user.id],
    relationName: "disputeResolvedByAdmin",
  }),
}));

export type User = typeof user.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type Provider = (typeof providerEnum.enumValues)[number];
export type TxStatus = (typeof txStatusEnum.enumValues)[number];
export type FundRequestStatus = (typeof fundRequestStatusEnum.enumValues)[number];
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type DisputeStatus = (typeof disputeStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type Notification = typeof notification.$inferSelect;
